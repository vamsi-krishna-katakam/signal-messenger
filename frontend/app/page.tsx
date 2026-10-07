"use client";

import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatPane from "@/components/chat/ChatPane";

export default function Page() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="h-screen bg-[#121212] flex items-center justify-center text-white text-sm select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#2C6BED] border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Signal Messenger...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen w-screen bg-[#121212] flex overflow-hidden font-sans">
      <Sidebar />
      <ChatPane />
    </div>
  );
}
