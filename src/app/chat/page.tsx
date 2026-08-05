"use client";

import { useState, useCallback, useEffect } from "react";
import { ChatMessages } from "@/components/chat/ChatMessages";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem("chat_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("chat_session_id", sid);
  }
  return sid;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm the clinic's virtual assistant. How can I help? I can answer questions, schedule appointments, or collect pre-anamnesis information.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      });
      const data = await res.json();

      if (data.reply) {
        const botMsg: Message = { role: "assistant", content: data.reply, timestamp: new Date().toISOString() };
        setMessages((prev) => [...prev, botMsg]);
        if (data.sessionId) {
          setSessionId(data.sessionId);
          localStorage.setItem("chat_session_id", data.sessionId);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId]);

  function newConversation() {
    const sid = crypto.randomUUID();
    setSessionId(sid);
    localStorage.setItem("chat_session_id", sid);
    setMessages([]);
  }

  return (
    <div className="min-h-screen bg-[#F4FAFA] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-teal-700">MedBook</h1>
          <p className="text-xs text-gray-400">Clinic virtual assistant</p>
        </div>
        <button
          onClick={newConversation}
          className="text-sm text-gray-500 hover:text-teal-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-teal-50"
        >
          New conversation
        </button>
      </header>

      <ChatMessages messages={messages} loading={loading} />

      <div className="border-t border-gray-200 bg-white p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="max-w-3xl mx-auto flex gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
