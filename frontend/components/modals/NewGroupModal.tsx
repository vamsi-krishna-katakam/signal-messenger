"use client";

import React, { useState, useEffect } from "react";
import { api, User } from "@/lib/api";
import { useChat } from "@/context/ChatContext";
import { getInitials } from "@/lib/utils";
import { X, Users, Check } from "lucide-react";

interface NewGroupModalProps {
  onClose: () => void;
}

export default function NewGroupModal({ onClose }: NewGroupModalProps) {
  const { createGroupChat } = useChat();
  const [title, setTitle] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch demo contacts for selection
    api
      .getDemoUsers()
      .then((users) => setAvailableUsers(users))
      .catch((err) => console.error("Failed to load users for group creation:", err));
  }, []);

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uId) => uId !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a group title");
      return;
    }
    if (selectedUserIds.length === 0) {
      setError("Please select at least 1 member for the group");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createGroupChat(title.trim(), selectedUserIds);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create group");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1E1E22] border border-[#27272A] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#27272A] flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2C6BED]" />
            Create New Group
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-[#28282D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleCreate} className="p-6 space-y-4 flex-1 overflow-y-auto">
          {error && <div className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg text-center">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Group Name</label>
            <input
              type="text"
              placeholder="e.g. Scalar SDE Team ⚡"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#121212] border border-[#27272A] rounded-lg px-3 py-2 text-sm text-white focus:border-[#2C6BED] outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">
              Select Group Members ({selectedUserIds.length} selected)
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {availableUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleSelectUser(u.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors border ${
                      isSelected
                        ? "bg-[#2C6BED]/20 border-[#2C6BED]"
                        : "bg-[#121212] border-[#27272A] hover:bg-[#28282D]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.display_name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#2C6BED] text-white flex items-center justify-center text-xs font-bold">
                          {getInitials(u.display_name)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-semibold">{u.display_name}</h4>
                        <p className="text-xs text-gray-400">@{u.username}</p>
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                        isSelected ? "bg-[#2C6BED] border-[#2C6BED]" : "border-gray-500"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3 border-t border-[#27272A]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || selectedUserIds.length === 0}
              className="px-5 py-2 bg-[#2C6BED] hover:bg-[#245AC5] disabled:opacity-50 text-xs font-bold text-white rounded-lg transition-colors shadow-md"
            >
              {isSubmitting ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
