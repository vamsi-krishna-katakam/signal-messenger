"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { getInitials, formatTime } from "@/lib/utils";
import { Search, Plus, UserPlus, Settings, LogOut, MessageSquare } from "lucide-react";
import NewChatModal from "../modals/NewChatModal";
import NewGroupModal from "../modals/NewGroupModal";
import SettingsModal from "../modals/SettingsModal";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const {
    conversations,
    activeConversation,
    selectConversation,
    searchQuery,
    setSearchQuery,
  } = useChat();

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Filter conversations by search query
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.title?.toLowerCase().includes(query) ||
      conv.last_message?.text.toLowerCase().includes(query)
    );
  });

  return (
    <aside className="w-80 md:w-96 bg-[#1E1E22] border-r border-[#27272A] flex flex-col h-full flex-shrink-0 select-none">
      {/* Sidebar Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#27272A] bg-[#1E1E22]">
        <div
          onClick={() => setIsSettingsOpen(true)}
          className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-lg hover:bg-[#28282D] transition-colors"
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-transparent group-hover:ring-[#2C6BED]"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#2C6BED] text-white flex items-center justify-center text-sm font-semibold">
              {getInitials(user?.display_name || "")}
            </div>
          )}
          <div className="overflow-hidden">
            <h2 className="text-sm font-semibold text-white truncate max-w-[130px]">
              {user?.display_name}
            </h2>
            <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Online
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 text-gray-400">
          <button
            onClick={() => setIsNewChatOpen(true)}
            title="New Direct Message"
            className="p-2 hover:bg-[#28282D] hover:text-white rounded-full transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsNewGroupOpen(true)}
            title="Create New Group"
            className="p-2 hover:bg-[#28282D] hover:text-white rounded-full transition-colors"
          >
            <UserPlus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
            className="p-2 hover:bg-[#28282D] hover:text-white rounded-full transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 bg-[#1E1E22]">
        <div className="relative flex items-center bg-[#121212] border border-[#27272A] rounded-lg focus-within:border-[#2C6BED] transition-colors">
          <Search className="w-4 h-4 text-gray-400 absolute left-3" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#27272A]/40">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            <p className="mb-2">No conversations found</p>
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="text-[#2C6BED] hover:underline font-medium text-xs"
            >
              Start a new chat
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = activeConversation?.id === conv.id;
            const otherParticipant = conv.participants.find(
              (p) => p.user_id !== user?.id
            )?.user;

            const displayTitle =
              conv.type === "direct"
                ? otherParticipant?.display_name || conv.title
                : conv.title;
            const displayAvatar =
              conv.type === "direct"
                ? otherParticipant?.avatar_url || conv.avatar_url
                : conv.avatar_url;

            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                  isActive
                    ? "bg-[#2E3036]"
                    : "hover:bg-[#28282D]"
                }`}
              >
                {/* Conversation Avatar */}
                <div className="relative flex-shrink-0">
                  {displayAvatar ? (
                    <img
                      src={displayAvatar}
                      alt={displayTitle || "Chat"}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#2E3035] text-white flex items-center justify-center text-base font-semibold border border-[#3A3D44]">
                      {getInitials(displayTitle || "")}
                    </div>
                  )}
                  {/* Online Status Dot for 1-on-1 */}
                  {conv.type === "direct" && otherParticipant?.is_online && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#1E1E22] rounded-full"></span>
                  )}
                </div>

                {/* Conversation Snippet info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-white truncate">
                      {displayTitle}
                    </h3>
                    {conv.last_message && (
                      <span className="text-xs text-gray-400">
                        {formatTime(conv.last_message.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400 truncate max-w-[180px]">
                      {conv.last_message
                        ? conv.last_message.text
                        : "No messages yet"}
                    </p>

                    {/* Unread Count Badge */}
                    {conv.unread_count > 0 && (
                      <span className="bg-[#2C6BED] text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer User Logout bar */}
      <div className="p-3 border-t border-[#27272A] bg-[#1E1E22] flex items-center justify-between text-xs text-gray-400">
        <span>Signal Messenger v1.0.0</span>
        <button
          onClick={() => logout()}
          className="flex items-center gap-1 text-rose-400 hover:text-rose-300 font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>

      {/* Modals */}
      {isNewChatOpen && (
        <NewChatModal onClose={() => setIsNewChatOpen(false)} />
      )}
      {isNewGroupOpen && (
        <NewGroupModal onClose={() => setIsNewGroupOpen(false)} />
      )}
      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}
    </aside>
  );
}
