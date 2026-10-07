"use client";

import React, { useState, useEffect } from "react";
import { api, User } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { getInitials } from "@/lib/utils";
import { X, Search, UserPlus } from "lucide-react";

interface NewChatModalProps {
  onClose: () => void;
}

export default function NewChatModal({ onClose }: NewChatModalProps) {
  const { user } = useAuth();
  const { startDirectChat } = useChat();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-load other registered users on modal open
    api
      .getDemoUsers()
      .then((users) => {
        setSearchResults(users.filter((u) => u.id !== user?.id));
      })
      .catch((err) => console.error("Failed to load initial users:", err));
  }, [user]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      const all = await api.getDemoUsers();
      setSearchResults(all);
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const results = await api.searchUsers(query.trim());
      setSearchResults(results);
      if (results.length === 0) {
        if (
          user &&
          (query.trim() === user.phone_number ||
            query.trim() === user.username ||
            query.trim() === user.display_name)
        ) {
          setError(
            "That's your own phone number/username! Search for another contact (e.g. 'alice' or '+15550101') to message them."
          );
        } else {
          setError("No user found with that phone number or username.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to search users");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUser = async (targetUser: User) => {
    try {
      await startDirectChat(targetUser.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Could not start chat");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1E1E22] border border-[#27272A] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#27272A] flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#2C6BED]" />
            New Direct Message
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-[#28282D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="p-4 border-b border-[#27272A] bg-[#121212]">
          <div className="relative flex items-center border border-[#27272A] rounded-lg focus-within:border-[#2C6BED] bg-[#1E1E22]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3" />
            <input
              type="text"
              placeholder="Enter phone number or username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent pl-9 pr-20 py-2.5 text-sm text-white placeholder-gray-500 outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={!query.trim() || isSearching}
              className="absolute right-2 px-3 py-1 bg-[#2C6BED] hover:bg-[#245AC5] disabled:opacity-50 text-xs font-semibold rounded-md transition-colors"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {error && <div className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg text-center">{error}</div>}

          {searchResults.map((u) => (
            <div
              key={u.id}
              onClick={() => handleSelectUser(u)}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-[#28282D] cursor-pointer transition-colors border border-transparent hover:border-[#27272A]"
            >
              <div className="flex items-center gap-3">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.display_name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#2C6BED] text-white flex items-center justify-center text-sm font-bold">
                    {getInitials(u.display_name)}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold">{u.display_name}</h4>
                  <p className="text-xs text-gray-400">@{u.username} • {u.phone_number}</p>
                </div>
              </div>
              <span className="text-xs text-[#2C6BED] font-medium">Chat ➔</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
