"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";

type WSEventCallback = (data: { type: string; payload: any }) => void;

interface WebSocketContextType {
  isConnected: boolean;
  sendMessage: (conversationId: string, text: string) => void;
  sendTypingStart: (conversationId: string) => void;
  sendTypingStop: (conversationId: string) => void;
  markRead: (conversationId: string) => void;
  subscribe: (callback: WSEventCallback) => () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Set<WSEventCallback>>(new Set());

  const connect = useCallback(() => {
    if (!token) return;

    // Close any active socket before connecting new one
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const getWsUrl = () => {
      if (process.env.NEXT_PUBLIC_WS_URL) return process.env.NEXT_PUBLIC_WS_URL;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const wsProtocol = apiUrl.startsWith("https") ? "wss://" : "ws://";
      const host = apiUrl.replace(/^https?:\/\//, "").replace(/\/api\/?$/, "");
      return `${wsProtocol}${host}/ws`;
    };
    const wsUrl = getWsUrl();
    const socket = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);

    socket.onopen = () => {
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        listenersRef.current.forEach((cb) => cb(parsed));
      } catch (err) {
        console.warn("Error parsing WebSocket message:", err);
      }
    };

    socket.onclose = (event) => {
      setIsConnected(false);
      // Do not auto-reconnect if token was rejected by server (code 1008)
      if (event.code !== 1008 && token) {
        setTimeout(() => {
          if (token) connect();
        }, 3000);
      }
    };

    socket.onerror = () => {
      // Handled quietly to prevent Next.js dev overlay popups on network shifts
      setIsConnected(false);
    };

    socketRef.current = socket;
  }, [token]);

  useEffect(() => {
    if (token) {
      connect();
    } else {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [token, connect]);

  const sendMessage = useCallback((conversationId: string, text: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "message:send",
          payload: { conversation_id: conversationId, text },
        })
      );
    }
  }, []);

  const sendTypingStart = useCallback((conversationId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "typing:start",
          payload: { conversation_id: conversationId },
        })
      );
    }
  }, []);

  const sendTypingStop = useCallback((conversationId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "typing:stop",
          payload: { conversation_id: conversationId },
        })
      );
    }
  }, []);

  const markRead = useCallback((conversationId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: "message:read",
          payload: { conversation_id: conversationId },
        })
      );
    }
  }, []);

  const subscribe = useCallback((callback: WSEventCallback) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        sendMessage,
        sendTypingStart,
        sendTypingStop,
        markRead,
        subscribe,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) throw new Error("useWebSocket must be used within a WebSocketProvider");
  return context;
};
