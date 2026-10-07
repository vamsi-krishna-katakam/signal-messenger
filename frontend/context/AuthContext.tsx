"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api, User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (loginStr: string, password?: string, otp?: string) => Promise<void>;
  register: (data: {
    first_name: string;
    last_name: string;
    phone_number: string;
    username: string;
    password?: string;
    otp?: string;
  }) => Promise<void>;
  quickLogin: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load session on app launch
  useEffect(() => {
    const savedToken = localStorage.getItem("signal_token");
    if (savedToken) {
      setToken(savedToken);
      api
        .getMe()
        .then((fetchedUser) => {
          setUser(fetchedUser);
        })
        .catch(() => {
          localStorage.removeItem("signal_token");
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (loginStr: string, password?: string, otp: string = "123456") => {
    const res = await api.login({ login: loginStr, password, otp });
    localStorage.setItem("signal_token", res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const register = async (data: {
    first_name: string;
    last_name: string;
    phone_number: string;
    username: string;
    password?: string;
    otp?: string;
  }) => {
    const res = await api.register(data);
    localStorage.setItem("signal_token", res.access_token);
    setToken(res.access_token);
    setUser(res.user);
  };

  const quickLogin = async (username: string) => {
    await login(username, "123456");
  };

  const logout = async () => {
    try {
      if (token) await api.logout();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      localStorage.removeItem("signal_token");
      setToken(null);
      setUser(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        quickLogin,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
