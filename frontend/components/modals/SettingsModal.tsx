"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { X, Settings as SettingsIcon, User, Moon, Lock, PhoneCall, Laptop } from "lucide-react";

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { user, updateUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);
    try {
      const updated = await api.updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim(),
      });
      updateUser(updated);
      setMessage("Profile updated successfully!");
    } catch (err: any) {
      setMessage(err.message || "Failed to update profile");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1E1E22] border border-[#27272A] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#27272A] flex items-center justify-between">
          <h2 className="text-base font-bold flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-[#2C6BED]" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded-full hover:bg-[#28282D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Profile Form */}
          <form onSubmit={handleUpdate} className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#2C6BED]" /> Profile Info
            </h3>

            <div className="flex items-center gap-4 bg-[#121212] p-3 rounded-xl border border-[#27272A]">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.display_name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#2C6BED] text-white flex items-center justify-center font-bold">
                  {getInitials(user?.display_name || "")}
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Username: @{user?.username}</p>
                <p className="text-xs text-gray-400">Phone: {user?.phone_number}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#121212] border border-[#27272A] rounded-lg px-3 py-2 text-sm text-white focus:border-[#2C6BED] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">About / Bio</label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-[#121212] border border-[#27272A] rounded-lg px-3 py-2 text-sm text-white focus:border-[#2C6BED] outline-none"
              />
            </div>

            {message && <p className="text-xs text-emerald-400 font-medium">{message}</p>}

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-2 bg-[#2C6BED] hover:bg-[#245AC5] disabled:opacity-50 text-xs font-bold text-white rounded-lg transition-colors"
            >
              {isUpdating ? "Saving..." : "Save Profile Changes"}
            </button>
          </form>

          {/* Appearance Section */}
          <div className="space-y-2 border-t border-[#27272A] pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-[#2C6BED]" /> Appearance
            </h3>
            <div className="flex items-center justify-between p-3 bg-[#121212] rounded-xl border border-[#27272A] text-xs">
              <span>Theme</span>
              <span className="font-semibold text-emerald-400">Signal Dark Mode (Default)</span>
            </div>
          </div>

          {/* Placeholders / Coming Soon */}
          <div className="space-y-2 border-t border-[#27272A] pt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Features (Coming Soon)</h3>
            <div className="space-y-1 text-xs text-gray-400">
              <div className="flex items-center justify-between p-2.5 bg-[#121212] rounded-lg">
                <span className="flex items-center gap-2"><PhoneCall className="w-4 h-4" /> Voice & Video Calling</span>
                <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-[10px]">Placeholder</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#121212] rounded-lg">
                <span className="flex items-center gap-2"><Laptop className="w-4 h-4" /> Linked Desktop Devices</span>
                <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-[10px]">Placeholder</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#121212] rounded-lg">
                <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> Cryptographic Key Management</span>
                <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-[10px]">Simulated</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
