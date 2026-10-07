"use client";

import React from "react";
import { AuthProvider } from "@/context/AuthContext";
import { WebSocketProvider } from "@/context/WebSocketContext";
import { ChatProvider } from "@/context/ChatContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <ChatProvider>{children}</ChatProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
}
