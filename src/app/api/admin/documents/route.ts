import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";
import { parseDocument, chunkText } from "@/lib/documents/parser";
import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq } from "drizzle-orm";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "text/plain",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookie = request.cookies.get(COOKIE_NAME);
    if (!cookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifySessionToken(cookie.value);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const clinicId = session.clinicId;
    if (!clinicId) {
      return NextResponse.json(
        { error: "No clinic associated" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (10MB max)" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse document content
    const { content } = parseDocument(buffer, file.type);

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from the file" },
        { status: 400 }
      );
    }

    // Chunk content for RAG
    const chunks = chunkText(content);

    // Save to database
    const [doc] = await db
      .insert(documents)
      .values({
        clinicId,
        name: file.name.replace(/\.[^/.]+$/, ""),
        fileName: file.name,
        fileType: file.type || "text/plain",
        fileSize: file.size,
        content,
        chunkCount: chunks.length,
        status: "ready",
        uploadedBy: session.userId,
      } as any)
      .returning({ id: documents.id });

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        name: file.name,
        chunkCount: chunks.length,
      },
    });
  } catch (error) {
    console.error("[Documents API] Error:", error);
    return NextResponse.json(
      { error: "Error processing file" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookie = request.cookies.get(COOKIE_NAME);
    if (!cookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifySessionToken(cookie.value);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const clinicId = session.clinicId;
    if (!clinicId) {
      return NextResponse.json({ documents: [] });
    }

    const docs = await db
      .select({
        id: documents.id,
        name: documents.name,
        fileName: documents.fileName,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        chunkCount: documents.chunkCount,
        status: documents.status,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(eq(documents.clinicId, clinicId));

    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error("[Documents API] Error:", error);
    return NextResponse.json(
      { error: "Error listing documents" },
      { status: 500 }
    );
  }
}
