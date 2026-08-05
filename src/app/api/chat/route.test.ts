/**
 * @jest-environment node
 */
import { POST } from "./route";
import { NextRequest } from "next/server";

const mockRunChatGraph = jest.fn();
const mockGetOrCreateSession = jest.fn().mockResolvedValue(undefined);
const mockGetChatMessages = jest.fn<Array<{ id: string; sessionId: string; role: "user" | "assistant"; content: string; createdAt: Date }>, []>().mockResolvedValue([]);
const mockSaveChatMessage = jest.fn().mockResolvedValue(undefined);

jest.mock("@/lib/langgraph/graph", () => ({
  runChatGraph: (...args: unknown[]) => mockRunChatGraph(...args),
}));

jest.mock("@/lib/chat/session", () => ({
  getOrCreateSession: (...args: unknown[]) => mockGetOrCreateSession(...args),
  getChatMessages: (...args: unknown[]) => mockGetChatMessages(...args),
  saveChatMessage: (...args: unknown[]) => mockSaveChatMessage(...args),
}));

function createRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLINIC_ID = "test-clinic";
  });

  it("returns 400 for empty message", async () => {
    const res = await POST(createRequest({ message: "" }));

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Message is required");
  });

  it("returns 400 for whitespace-only message", async () => {
    const res = await POST(createRequest({ message: "   " }));

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing message field", async () => {
    const res = await POST(createRequest({}));

    expect(res.status).toBe(400);
  });

  it("returns 400 for non-string message", async () => {
    const res = await POST(createRequest({ message: 123 }));

    expect(res.status).toBe(400);
  });

  it("processes valid message and returns reply", async () => {
    mockRunChatGraph.mockResolvedValue({
      messages: [{ content: "How can I help?" }],
    });

    const res = await POST(createRequest({ message: "Hi" }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.reply).toBe("How can I help?");
    expect(json.sessionId).toBeDefined();
  });

  it("persists user and assistant messages", async () => {
    mockRunChatGraph.mockResolvedValue({
      messages: [{ content: "Reply" }],
    });

    await POST(createRequest({ message: "test" }));

    expect(mockSaveChatMessage).toHaveBeenCalledTimes(2);
    expect(mockSaveChatMessage).toHaveBeenCalledWith(expect.any(String), "user", "test");
    expect(mockSaveChatMessage).toHaveBeenCalledWith(expect.any(String), "assistant", "Reply");
  });

  it("uses provided sessionId", async () => {
    mockRunChatGraph.mockResolvedValue({
      messages: [{ content: "Ok" }],
    });

    const res = await POST(createRequest({ message: "Hi", sessionId: "custom-session" }));

    const json = await res.json();
    expect(json.sessionId).toBe("custom-session");
  });

  it("loads chat history for existing session", async () => {
    mockGetChatMessages.mockResolvedValue([
      { id: "1", sessionId: "s1", role: "user", content: "Hi", createdAt: new Date() },
    ]);
    mockRunChatGraph.mockResolvedValue({
      messages: [{ content: "Reply" }],
    });

    await POST(createRequest({ message: "How are you?", sessionId: "s1" }));

    expect(mockGetChatMessages).toHaveBeenCalledWith("s1");
  });

  it("handles empty graph messages gracefully", async () => {
    mockRunChatGraph.mockResolvedValue({ messages: [] });

    const res = await POST(createRequest({ message: "Hi" }));

    const json = await res.json();
    expect(json.reply).toBe("Sorry, an error occurred while processing your message.");
  });

  it("returns 500 on graph error", async () => {
    mockRunChatGraph.mockRejectedValue(new Error("Graph error"));

    const res = await POST(createRequest({ message: "Hi" }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("Internal server error");
  });
});
