"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { api, Conversation, Message, User } from "@/lib/api";
import { useAuth } from "./AuthContext";
import { useWebSocket } from "./WebSocketContext";

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  typingUsers: Record<string, string[]>; // conv_id -> list of typing user_ids
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectConversation: (conversation: Conversation) => void;
  sendChatMessage: (text: string) => void;
  startDirectChat: (targetUserId: string) => Promise<Conversation>;
  createGroupChat: (title: string, memberUserIds: string[]) => Promise<Conversation>;
  addGroupMember: (groupId: string, userIds: string[]) => Promise<void>;
  removeGroupMember: (groupId: string, targetUserId: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  handleTyping: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { sendMessage, sendTypingStart, sendTypingStop, markRead, subscribe } = useWebSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const activeConvRef = useRef<Conversation | null>(null);
  activeConvRef.current = activeConversation;

  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch conversation list on login
  const refreshConversations = useCallback(async () => {
    if (!userRef.current) return;
    setIsLoadingConversations(true);
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (e) {
      console.error("Failed to load conversations:", e);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    setActiveConversation(null);
    setMessages([]);
    setTypingUsers({});
    if (user) {
      refreshConversations();
    } else {
      setConversations([]);
    }
  }, [user, refreshConversations]);

  // Load message history when active conversation changes
  const selectConversation = useCallback(
    async (conv: Conversation) => {
      setActiveConversation(conv);
      setIsLoadingMessages(true);
      try {
        const msgs = await api.getMessages(conv.id);
        setMessages(msgs);

        // Mark unread messages as read
        if (conv.unread_count > 0) {
          try {
            await api.markMessagesRead(conv.id);
            markRead(conv.id);
            // Decrement unread count locally
            setConversations((prev) =>
              prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
            );
          } catch (readErr) {
            console.error("Failed to mark messages as read:", readErr);
          }
        }
      } catch (e) {
        console.error("Failed to load messages:", e);
        setMessages([]);
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [markRead]
  );

  // Single WebSocket listener subscription using refs to prevent duplicate handlers/state bugs
  useEffect(() => {
    const unsubscribe = subscribe(({ type, payload }) => {
      const currentActiveConv = activeConvRef.current;
      const currentUser = userRef.current;

      // EVENT: New Incoming Message
      if (type === "message:new") {
        const newMsg: Message = payload;

        // Append to current messages if viewing this conversation (with deduplication check)
        if (currentActiveConv && currentActiveConv.id === newMsg.conversation_id) {
          setMessages((prevMsgs) => {
            // Replace any optimistic message with actual server message
            const filtered = prevMsgs.filter(
              (m) => !(m.id.startsWith("temp-") && m.text === newMsg.text)
            );
            if (filtered.some((m) => m.id === newMsg.id)) {
              return filtered; // Deduplicate
            }
            return [...filtered, newMsg];
          });

          // Mark read if viewer is recipient
          if (currentUser && newMsg.sender_id !== currentUser.id) {
            markRead(newMsg.conversation_id);
          }
        }

        // Update conversation list item last message & unread count
        setConversations((prevConvs) => {
          const convExists = prevConvs.some((c) => c.id === newMsg.conversation_id);
          if (!convExists) {
            // Fetch newly created conversation into recipient's sidebar
            refreshConversations();
            return prevConvs;
          }
          return prevConvs.map((conv) => {
            if (conv.id === newMsg.conversation_id) {
              const isCurrentChat = currentActiveConv?.id === newMsg.conversation_id;
              return {
                ...conv,
                last_message: newMsg,
                updated_at: newMsg.created_at,
                unread_count: isCurrentChat ? 0 : conv.unread_count + 1,
              };
            }
            return conv;
          });
        });
      }

      // EVENT: Typing status change
      else if (type === "typing:status") {
        const { conversation_id, user_id, is_typing } = payload;
        
        // Ignore typing event if it belongs to current user
        if (currentUser && user_id === currentUser.id) return;

        setTypingUsers((prev) => {
          const currentTyping = prev[conversation_id] || [];
          if (is_typing) {
            if (!currentTyping.includes(user_id)) {
              return { ...prev, [conversation_id]: [...currentTyping, user_id] };
            }
          } else {
            return {
              ...prev,
              [conversation_id]: currentTyping.filter((id) => id !== user_id),
            };
          }
          return prev;
        });
      }

      // EVENT: Message receipt status update
      else if (type === "message:receipt") {
        const { conversation_id, user_id, status } = payload;
        if (currentUser) {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.conversation_id === conversation_id && msg.sender_id === currentUser.id) {
                const updatedReceipts = msg.receipts.map((r) =>
                  r.user_id === user_id ? { ...r, status } : r
                );
                return { ...msg, receipts: updatedReceipts };
              }
              return msg;
            })
          );
        }
      }

      // EVENT: Real-time User Online/Offline Status Change
      else if (type === "user:status") {
        const { user_id, is_online } = payload;

        // Update conversation participant online status in sidebar list
        setConversations((prevConvs) =>
          prevConvs.map((conv) => {
            const updatedParticipants = conv.participants.map((p) =>
              p.user_id === user_id
                ? { ...p, user: { ...p.user, is_online } }
                : p
            );
            return { ...conv, participants: updatedParticipants };
          })
        );

        // Update active conversation participant online status
        setActiveConversation((prevActive) => {
          if (!prevActive) return null;
          const updatedParticipants = prevActive.participants.map((p) =>
            p.user_id === user_id
              ? { ...p, user: { ...p.user, is_online } }
              : p
          );
          return { ...prevActive, participants: updatedParticipants };
        });
      }
    });

    return () => unsubscribe();
  }, [subscribe, markRead, refreshConversations]);

  // Handle typing debounce
  const handleTyping = useCallback(() => {
    const currentActiveConv = activeConvRef.current;
    if (!currentActiveConv) return;

    sendTypingStart(currentActiveConv.id);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop(currentActiveConv.id);
    }, 2000);
  }, [sendTypingStart, sendTypingStop]);

  // Send message
  const sendChatMessage = useCallback(
    (text: string) => {
      const currentActiveConv = activeConvRef.current;
      const currentUser = userRef.current;
      if (!currentActiveConv || !currentUser || !text.trim()) return;

      // Stop typing status
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      sendTypingStop(currentActiveConv.id);

      // Create optimistic message object for immediate UI display
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: Message = {
        id: tempId,
        conversation_id: currentActiveConv.id,
        sender_id: currentUser.id,
        sender: currentUser,
        text: text.trim(),
        created_at: new Date().toISOString(),
        is_system: false,
        receipts: [],
      };

      // Optimistically append message to local messages list
      setMessages((prev) => [...prev, optimisticMsg]);

      // Update sidebar last message snippet
      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentActiveConv.id
            ? { ...c, last_message: optimisticMsg, updated_at: optimisticMsg.created_at }
            : c
        )
      );

      // Emit WS event to server
      sendMessage(currentActiveConv.id, text.trim());
    },
    [sendMessage, sendTypingStop]
  );

  // Start or open 1-on-1 direct chat
  const startDirectChat = async (targetUserId: string) => {
    const conv = await api.getDirectConversation(targetUserId);
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conv.id);
      if (exists) {
        return prev.map((c) => (c.id === conv.id ? conv : c));
      }
      return [conv, ...prev];
    });
    selectConversation(conv);
    refreshConversations();
    return conv;
  };

  // Create new group chat
  const createGroupChat = async (title: string, memberUserIds: string[]) => {
    const conv = await api.createGroup(title, memberUserIds);
    setConversations((prev) => [conv, ...prev]);
    selectConversation(conv);
    refreshConversations();
    return conv;
  };

  // Add group members
  const addGroupMember = async (groupId: string, userIds: string[]) => {
    const updatedConv = await api.addGroupMembers(groupId, userIds);
    await refreshConversations();
    if (activeConvRef.current?.id === groupId) {
      setActiveConversation(updatedConv);
    }
  };

  // Remove group member
  const removeGroupMember = async (groupId: string, targetUserId: string) => {
    const updatedConv = await api.removeGroupMember(groupId, targetUserId);
    await refreshConversations();
    if (activeConvRef.current?.id === groupId) {
      setActiveConversation(updatedConv);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        isLoadingConversations,
        isLoadingMessages,
        typingUsers,
        searchQuery,
        setSearchQuery,
        selectConversation,
        sendChatMessage,
        startDirectChat,
        createGroupChat,
        addGroupMember,
        removeGroupMember,
        refreshConversations,
        handleTyping,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error("useChat must be used within a ChatProvider");
  return context;
};
