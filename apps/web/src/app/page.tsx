"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/session/logout", { method: "POST" });
    router.refresh();
  }
  return (
    <main className="min-h-screen p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold mb-4">InfluencerAI Dashboard</h1>
        <button onClick={logout} className="border rounded px-3 py-1">
          Logout
        </button>
      </div>
      <p className="text-gray-600">Virtual Influencer Content Generation Platform</p>
    </main>
  );
}
