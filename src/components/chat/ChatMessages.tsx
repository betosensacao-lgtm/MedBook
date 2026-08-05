"use client";

import { useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface Props {
  messages: Message[];
  loading: boolean;
}

function formatTime(ts?: string) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "";
  }
}

export function ChatMessages({ messages, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm p-8 text-center">
        <span className="text-3xl mb-3">💬</span>
        <span>Send a message to get started.</span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg, i) => {
        const isUser = msg.role === "user";
        const time = formatTime(msg.timestamp);
        return (
          <div key={i} className={`flex items-end gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
            {isUser ? (
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-sm">
                V
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold shrink-0 shadow-sm">
                M
              </div>
            )}
            <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
              <div
                className={`px-4 py-2.5 text-sm leading-relaxed ${
                  isUser
                    ? "bg-teal-600 text-white rounded-2xl rounded-br-md"
                    : "bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md"
                }`}
              >
                {msg.content}
              </div>
              {time && (
                <span className="text-[10px] text-gray-400 mt-1 px-1">{time}</span>
              )}
            </div>
          </div>
        );
      })}
      {loading && (
        <div className="flex items-end gap-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold shrink-0 shadow-sm">
            M
          </div>
          <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
            <span className="inline-flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
