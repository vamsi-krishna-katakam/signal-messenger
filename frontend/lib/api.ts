const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface User {
  id: string;
  phone_number: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  is_online: boolean;
  last_seen?: string;
}

export interface MessageReceipt {
  user_id: string;
  status: "sent" | "delivered" | "read";
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: User;
  text: string;
  created_at: string;
  receipts: MessageReceipt[];
}

export interface Participant {
  user_id: string;
  role: "admin" | "member";
  user: User;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  title?: string;
  avatar_url?: string;
  created_by_id?: string;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  last_message?: Message;
  unread_count: number;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("signal_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || "API request failed");
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: {
    first_name: string;
    last_name: string;
    phone_number: string;
    username: string;
    password?: string;
    otp?: string;
  }) =>
    request<{ access_token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...data, otp: data.otp || "123456" }),
    }),

  login: (data: { login: string; password?: string; otp?: string }) =>
    request<{ access_token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ ...data, otp: data.otp || "123456" }),
    }),

  getMe: () => request<User>("/auth/me"),
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),

  // Users & Contacts
  getDemoUsers: () => request<User[]>("/users/demo-users"),
  searchUsers: (query: string) => request<User[]>(`/users/search?query=${encodeURIComponent(query)}`),
  getContacts: () => request<any[]>("/contacts"),
  addContact: (phone_or_username: string, nickname?: string) =>
    request<any>("/contacts", {
      method: "POST",
      body: JSON.stringify({ phone_or_username, nickname }),
    }),
  updateProfile: (data: { display_name?: string; avatar_url?: string; bio?: string }) =>
    request<User>("/users/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Conversations & Messages
  getConversations: () => request<Conversation[]>("/conversations"),
  getDirectConversation: (targetUserId: string) =>
    request<Conversation>(`/conversations/direct/${targetUserId}`, { method: "POST" }),
  getMessages: (conversationId: string) => request<Message[]>(`/messages/conversation/${conversationId}`),
  markMessagesRead: (conversationId: string) =>
    request<{ message: string; count: number }>(`/messages/read/${conversationId}`, { method: "POST" }),

  // Groups
  createGroup: (title: string, memberUserIds: string[], avatarUrl?: string) =>
    request<Conversation>("/groups/create", {
      method: "POST",
      body: JSON.stringify({ title, member_user_ids: memberUserIds, avatar_url: avatarUrl }),
    }),
  addGroupMembers: (groupId: string, userIds: string[]) =>
    request<Conversation>(`/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_ids: userIds }),
    }),
  removeGroupMember: (groupId: string, targetUserId: string) =>
    request<Conversation>(`/groups/${groupId}/members/${targetUserId}`, {
      method: "DELETE",
    }),
};
