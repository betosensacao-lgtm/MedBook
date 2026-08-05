import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { normalizeMessage, detectPlatform } from "@/lib/meta/normalizer";
import { sendMessageToMeta } from "@/lib/meta/sender";
import { runChatGraph } from "@/lib/langgraph/graph";
import { HumanMessage } from "@langchain/core/messages";
import type { MetaPlatform } from "@/types/meta";

function verifySignature(request: NextRequest, rawBody: string): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return false;

  const signature = request.headers.get("x-hub-signature-256");
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace("sha256=", "")),
    Buffer.from(expected)
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const platform = detectPlatform(JSON.parse(rawBody));
  if (!platform) {
    return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
  }

  if (process.env.META_APP_SECRET) {
    if (!verifySignature(request, rawBody)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const body = JSON.parse(rawBody);
  const messages = normalizeMessage(body);

  if (messages.length === 0) {
    return NextResponse.json({ status: "ok" });
  }

  for (const msg of messages) {
    try {
      const threadId = `${msg.platform}:${msg.senderId}`;
      const result = await runChatGraph(
        {
          messages: [new HumanMessage(msg.text)],
          platform: msg.platform,
          userId: msg.senderId,
          sessionId: threadId,
        },
        threadId
      );

      const lastMessage = result.messages[result.messages.length - 1];
      const responseText =
        typeof lastMessage?.content === "string"
          ? lastMessage.content
          : "Sorry, an error occurred while processing your message.";

      await sendMessageToMeta(msg.platform, msg.senderId, responseText);
    } catch (error) {
      console.error(`[Webhook] Error processing ${msg.platform} message:`, error);
      try {
        await sendMessageToMeta(
          msg.platform,
          msg.senderId,
          "Sorry, an internal error occurred. Please try again in a moment."
        );
      } catch (sendErr) {
        console.error("[Webhook] Failed to send error response:", sendErr);
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
