"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { getInitials, formatTime, formatDateSeparator } from "@/lib/utils";
import { Phone, Video, Info, Send, Paperclip, Smile, Check, CheckCheck } from "lucide-react";
import GroupDetailsModal from "../modals/GroupDetailsModal";

export default function ChatPane() {
  const { user } = useAuth();
  const {
    activeConversation,
    messages,
    isLoadingMessages,
    sendChatMessage,
    handleTyping,
    typingUsers,
  } = useChat();

  const [textInput, setTextInput] = useState("");
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!activeConversation) {
    return (
      <div className="flex-1 bg-[#121212] flex flex-col items-center justify-center text-center p-6 select-none">
        <div className="w-20 h-20 rounded-full bg-[#1E1E22] border border-[#27272A] flex items-center justify-center text-[#2C6BED] mb-4 shadow-lg">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Signal Messenger</h2>
        <p className="text-sm text-gray-400 max-w-sm">
          Select a conversation from the sidebar or start a new chat to begin messaging.
        </p>
      </div>
    );
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendChatMessage(textInput);
    setTextInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  // Other participant for 1-on-1 chat
  const otherParticipant = activeConversation.participants.find(
    (p) => p.user_id !== user?.id
  )?.user;

  // Typing users list for current active chat
  const currentTypingIds = (typingUsers[activeConversation.id] || []).filter(
    (id) => id !== user?.id
  );

  // Compute display title and avatar for 1-on-1 vs group chats
  const displayTitle =
    activeConversation.type === "direct"
      ? otherParticipant?.display_name || activeConversation.title
      : activeConversation.title;
  const displayAvatar =
    activeConversation.type === "direct"
      ? otherParticipant?.avatar_url || activeConversation.avatar_url
      : activeConversation.avatar_url;

  return (
    <div className="flex-1 bg-[#121212] flex flex-col h-full overflow-hidden">
      {/* Chat Header */}
      <div className="h-16 px-6 bg-[#1E1E22] border-b border-[#27272A] flex items-center justify-between flex-shrink-0 select-none">
        <div
          onClick={() => {
            if (activeConversation.type === "group") setIsGroupDetailsOpen(true);
          }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayTitle || "Chat"}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#2C6BED] text-white flex items-center justify-center font-semibold text-sm">
              {getInitials(displayTitle || "")}
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold text-white group-hover:underline">
              {displayTitle}
            </h2>
            <p className="text-xs text-gray-400">
              {activeConversation.type === "group"
                ? `${activeConversation.participants.length} members`
                : otherParticipant?.is_online
                ? "Online"
                : "Offline"}
            </p>
          </div>
        </div>

        {/* Action Header Icons */}
        <div className="flex items-center gap-3 text-gray-400">
          <button
            onClick={() => alert("Voice call — Coming Soon")}
            title="Voice Call (Placeholder)"
            className="p-2 hover:bg-[#28282D] hover:text-white rounded-full transition-colors"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => alert("Video call — Coming Soon")}
            title="Video Call (Placeholder)"
            className="p-2 hover:bg-[#28282D] hover:text-white rounded-full transition-colors"
          >
            <Video className="w-5 h-5" />
          </button>
          {activeConversation.type === "group" && (
            <button
              onClick={() => setIsGroupDetailsOpen(true)}
              title="Group Details & Admin Controls"
              className="p-2 hover:bg-[#28282D] hover:text-white rounded-full transition-colors"
            >
              <Info className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Loading message history...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <p className="text-sm">No messages yet in this conversation.</p>
            <p className="text-xs mt-1">Send a message below to start chatting!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === user?.id;
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const showDateHeader =
              !prevMsg ||
              formatDateSeparator(msg.created_at) !==
                formatDateSeparator(prevMsg.created_at);

            // Compute receipt checkmark status for sent messages
            let receiptIcon = <Check className="w-3.5 h-3.5 text-gray-400" />;
            const isRead = msg.receipts.some((r) => r.status === "read");
            const isDelivered = msg.receipts.some((r) => r.status === "delivered");

            if (isRead) {
              receiptIcon = <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
            } else if (isDelivered) {
              receiptIcon = <CheckCheck className="w-3.5 h-3.5 text-gray-400" />;
            }

            return (
              <React.Fragment key={msg.id}>
                {/* Date Divider Pill */}
                {showDateHeader && (
                  <div className="flex justify-center my-3 select-none">
                    <span className="bg-[#1E1E22] text-gray-400 border border-[#27272A] text-[11px] font-medium px-3 py-1 rounded-full shadow-sm">
                      {formatDateSeparator(msg.created_at)}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`flex items-end gap-2 ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Sender Avatar for Group Messages */}
                  {!isMe && activeConversation.type === "group" && (
                    msg.sender?.avatar_url ? (
                      <img
                        src={msg.sender.avatar_url}
                        alt={msg.sender?.display_name || "User"}
                        className="w-7 h-7 rounded-full object-cover mb-1 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#2C6BED] text-white flex items-center justify-center font-semibold text-[10px] mb-1 flex-shrink-0">
                        {getInitials(msg.sender?.display_name || "")}
                      </div>
                    )
                  )}

                  <div
                    className={`max-w-[75%] md:max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm text-sm break-words relative ${
                      isMe
                        ? "bg-[#2C6BED] text-white rounded-br-none"
                        : "bg-[#2E3035] text-white rounded-bl-none border border-[#3B3E46]"
                    }`}
                  >
                    {/* Sender Name in Group */}
                    {!isMe && activeConversation.type === "group" && (
                      <div className="text-[11px] font-semibold text-emerald-400 mb-0.5">
                        {msg.sender?.display_name}
                      </div>
                    )}

                    {/* Message Text */}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                    {/* Timestamp & Status Checkmark */}
                    <div
                      className={`flex items-center gap-1 justify-end mt-1 text-[10px] ${
                        isMe ? "text-blue-100" : "text-gray-400"
                      }`}
                    >
                      <span>{formatTime(msg.created_at)}</span>
                      {isMe && <span>{receiptIcon}</span>}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}

        {/* Live Typing Indicator */}
        {currentTypingIds.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 italic py-1 animate-pulse">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-100"></span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce delay-200"></span>
            </div>
            <span>
              {currentTypingIds
                .map(
                  (id) =>
                    activeConversation.participants.find((p) => p.user_id === id)?.user
                      ?.display_name || "Someone"
                )
                .join(", ")}{" "}
              is typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer Area */}
      <form
        onSubmit={handleSend}
        className="p-4 bg-[#1E1E22] border-t border-[#27272A] flex items-center gap-3 select-none"
      >
        <button
          type="button"
          onClick={() => alert("Attachments — Coming Soon")}
          className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-[#28282D] transition-colors"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <div className="flex-1 relative flex items-center bg-[#121212] border border-[#27272A] rounded-full focus-within:border-[#2C6BED] transition-colors px-4 py-1.5">
          <input
            type="text"
            placeholder="Signal message..."
            value={textInput}
            onChange={(e) => {
              setTextInput(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none pr-8"
          />
          <button
            type="button"
            className="absolute right-3 text-gray-400 hover:text-white"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        <button
          type="submit"
          disabled={!textInput.trim()}
          className="p-2.5 bg-[#2C6BED] hover:bg-[#245AC5] disabled:opacity-40 disabled:hover:bg-[#2C6BED] text-white rounded-full transition-colors flex items-center justify-center shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Group Info Modal */}
      {isGroupDetailsOpen && activeConversation.type === "group" && (
        <GroupDetailsModal
          conversation={activeConversation}
          onClose={() => setIsGroupDetailsOpen(false)}
        />
      )}
    </div>
  );
}
