"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { MessageSquare, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");

  // Login form state
  const [loginInput, setLoginInput] = useState("");
  const [loginOtp, setLoginOtp] = useState("123456");

  // Register form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [registerOtp, setRegisterOtp] = useState("123456");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginInput.trim()) {
      setError("Please enter your Phone Number or Username");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await login(loginInput.trim(), undefined, loginOtp.trim());
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your First Name and Last Name");
      return;
    }
    if (!phoneNumber.trim()) {
      setError("Please enter your Mobile Number");
      return;
    }
    if (!username.trim()) {
      setError("Please enter a unique Username");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
        username: username.trim(),
        otp: registerOtp.trim(),
      });
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-3 md:p-6 select-none">
      {/* Scrollable Container Card (Scrollbar Hidden) */}
      <div className="w-full max-w-md bg-[#1E1E22] border border-[#27272A] rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[92vh] overflow-y-auto no-scrollbar space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2 flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-[#2C6BED] text-white flex items-center justify-center mx-auto shadow-lg shadow-[#2C6BED]/30">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Signal Messenger</h1>
          <p className="text-xs text-gray-400">Simple. Powerful. Secure.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#27272A] flex-shrink-0">
          <button
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              mode === "login"
                ? "border-[#2C6BED] text-[#2C6BED]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              mode === "register"
                ? "border-[#2C6BED] text-[#2C6BED]"
                : "border-transparent text-gray-400 hover:text-white"
            }`}
          >
            Register Account
          </button>
        </div>

        {error && (
          <div className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg text-center border border-rose-500/20 flex-shrink-0">
            {error}
          </div>
        )}

        {/* Login Form */}
        {mode === "login" ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4 flex-1">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Phone Number or Username
              </label>
              <input
                type="text"
                placeholder="e.g. +15550101 or alice"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="w-full bg-[#121212] border border-[#27272A] rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-[#2C6BED] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                placeholder="123456"
                value={loginOtp}
                onChange={(e) => setLoginOtp(e.target.value)}
                className="w-full bg-[#121212] border border-[#27272A] rounded-lg px-3.5 py-2.5 text-sm text-white focus:border-[#2C6BED] outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !loginInput.trim()}
              className="w-full py-3 bg-[#2C6BED] hover:bg-[#245AC5] disabled:opacity-50 text-xs font-bold text-white rounded-lg transition-colors shadow-md mt-2"
            >
              {isSubmitting ? "Signing In..." : "Continue to Messenger"}
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5 flex-1 pb-2">
            {/* First Name & Last Name Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">First Name</label>
                <input
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-[#121212] border border-[#27272A] rounded-lg px-3 py-2 text-sm text-white focus:border-[#2C6BED] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Last Name</label>
                <input
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-[#121212] border border-[#27272A] rounded-lg px-3 py-2 text-sm text-white focus:border-[#2C6BED] outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Mobile Number
              </label>
              <input
                type="text"
                placeholder="+15550999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full bg-[#121212] border border-[#27272A] rounded-lg px-3.5 py-2 text-sm text-white focus:border-[#2C6BED] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Username
              </label>
              <input
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#121212] border border-[#27272A] rounded-lg px-3.5 py-2 text-sm text-white focus:border-[#2C6BED] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                placeholder="123456"
                value={registerOtp}
                onChange={(e) => setRegisterOtp(e.target.value)}
                className="w-full bg-[#121212] border border-[#27272A] rounded-lg px-3.5 py-2 text-sm text-white focus:border-[#2C6BED] outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#2C6BED] hover:bg-[#245AC5] disabled:opacity-50 text-xs font-bold text-white rounded-lg transition-colors shadow-md mt-4 mb-1"
            >
              {isSubmitting ? "Creating Account..." : "Create Account & Sign In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
