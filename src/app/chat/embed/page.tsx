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
  let sid = localStorage.getItem("chat_embed_session_id");
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem("chat_embed_session_id", sid);
  }
  return sid;
}

export default function ChatEmbedPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm the clinic's virtual assistant. How can I help?",
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
          localStorage.setItem("chat_embed_session_id", data.sessionId);
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

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden" style={{ height: "100dvh" }}>
      <div className="bg-teal-700 px-4 py-3 flex items-center justify-between shrink-0">
        <span className="text-sm font-medium text-white">MedBook - Assistant</span>
        <button
          onClick={() => {
            const sid = crypto.randomUUID();
            setSessionId(sid);
            localStorage.setItem("chat_embed_session_id", sid);
            setMessages([]);
          }}
          className="text-xs text-teal-100 hover:text-white transition-colors"
        >
          New conversation
        </button>
      </div>

      <ChatMessages messages={messages} loading={loading} />

      <div className="border-t border-gray-200 p-3 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors shrink-0"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
