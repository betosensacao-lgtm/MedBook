import { NextResponse } from "next/server";
import { generateAuthUrl } from "@/lib/google";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/documents",
];

export async function GET() {
  try {
    const url = generateAuthUrl(SCOPES);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("[GOOGLE OAUTH]", error);
    return NextResponse.json(
      { error: "Failed to initiate Google OAuth" },
      { status: 500 }
    );
  }
}
