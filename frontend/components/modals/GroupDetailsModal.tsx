"use client";

import React, { useState, useEffect } from "react";
import { api, Conversation, User } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { getInitials } from "@/lib/utils";
import { X, ShieldCheck, UserMinus, UserPlus } from "lucide-react";

interface GroupDetailsModalProps {
  conversation: Conversation;
  onClose: () => void;
}

export default function GroupDetailsModal({ conversation, onClose }: GroupDetailsModalProps) {
  const { user } = useAuth();
  const { addGroupMember, removeGroupMember } = useChat();

  const [availableToAdd, setAvailableToAdd] = useState<User[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedAddIds, setSelectedAddIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if current user is admin of group
  const myParticipant = conversation.participants.find((p) => p.user_id === user?.id);
  const isAdmin = myParticipant?.role === "admin";

  useEffect(() => {
    if (showAddMember) {
      api.getDemoUsers().then((allUsers) => {
        const existingIds = new Set(conversation.participants.map((p) => p.user_id));
        setAvailableToAdd(allUsers.filter((u) => !existingIds.has(u.id)));
      });
    }
  }, [showAddMember, conversation.participants]);

  const handleAddMembers = async () => {
    if (selectedAddIds.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await addGroupMember(conversation.id, selectedAddIds);
      setShowAddMember(false);
      setSelectedAddIds([]);
    } catch (err: any) {
      setError(err.message || "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!confirm("Are you sure you want to remove this member from the group?")) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await removeGroupMember(conversation.id, targetUserId);
    } catch (err: any) {
      setError(err.message || "Failed to remove member");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1E1E22] border border-[#27272A] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#27272A] flex items-center justify-between">
          <h2 className="text-base font-bold">Group Details</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-[#28282D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Profile Header */}
        <div className="p-6 text-center border-b border-[#27272A] bg-[#121212]">
          {conversation.avatar_url ? (
            <img
              src={conversation.avatar_url}
              alt={conversation.title || "Group"}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-2 border-2 border-[#2C6BED]"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#2C6BED] text-white flex items-center justify-center text-xl font-bold mx-auto mb-2">
              {getInitials(conversation.title || "")}
            </div>
          )}
          <h3 className="text-lg font-bold">{conversation.title}</h3>
          <p className="text-xs text-gray-400 mt-1">
            {conversation.participants.length} group members
          </p>
        </div>

        {/* Members List */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {error && <div className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg text-center">{error}</div>}

          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Members</h4>
            {isAdmin && !showAddMember && (
              <button
                onClick={() => setShowAddMember(true)}
                className="text-xs text-[#2C6BED] hover:underline flex items-center gap-1 font-medium"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Add Members
              </button>
            )}
          </div>

          {/* Add Members Panel */}
          {showAddMember && (
            <div className="bg-[#121212] p-3 rounded-xl border border-[#27272A] space-y-2">
              <h5 className="text-xs font-semibold text-gray-300">Select users to add:</h5>
              {availableToAdd.length === 0 ? (
                <p className="text-xs text-gray-500">No additional users available to add.</p>
              ) : (
                availableToAdd.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center justify-between p-2 hover:bg-[#28282D] rounded-lg cursor-pointer text-xs"
                  >
                    <span>{u.display_name} (@{u.username})</span>
                    <input
                      type="checkbox"
                      checked={selectedAddIds.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedAddIds([...selectedAddIds, u.id]);
                        else setSelectedAddIds(selectedAddIds.filter((id) => id !== u.id));
                      }}
                      className="accent-[#2C6BED]"
                    />
                  </label>
                ))
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-3 py-1 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMembers}
                  disabled={selectedAddIds.length === 0 || isSubmitting}
                  className="px-3 py-1 bg-[#2C6BED] text-xs font-bold rounded-md disabled:opacity-50"
                >
                  Add Selected
                </button>
              </div>
            </div>
          )}

          {/* Member Rows */}
          <div className="space-y-2">
            {conversation.participants.map((p) => {
              const isMe = p.user_id === user?.id;
              return (
                <div
                  key={p.user_id}
                  className="flex items-center justify-between p-2.5 bg-[#121212] rounded-xl border border-[#27272A]"
                >
                  <div className="flex items-center gap-3">
                    {p.user.avatar_url ? (
                      <img src={p.user.avatar_url} alt={p.user.display_name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#2C6BED] text-white flex items-center justify-center text-xs font-bold">
                        {getInitials(p.user.display_name)}
                      </div>
                    )}
                    <div>
                      <h5 className="text-xs font-semibold flex items-center gap-1.5">
                        {p.user.display_name} {isMe && "(You)"}
                        {p.role === "admin" && (
                          <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3" /> Admin
                          </span>
                        )}
                      </h5>
                      <p className="text-[11px] text-gray-400">@{p.user.username}</p>
                    </div>
                  </div>

                  {/* Remove Button for Admin */}
                  {isAdmin && !isMe && (
                    <button
                      onClick={() => handleRemoveMember(p.user_id)}
                      disabled={isSubmitting}
                      title="Remove Member"
                      className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
