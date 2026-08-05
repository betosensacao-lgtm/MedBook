import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, hashPassword, COOKIE_NAME } from "@/lib/auth";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    // Verify the requesting user is a super_admin
    const cookie = request.cookies.get(COOKIE_NAME);
    if (!cookie) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const session = await verifySessionToken(cookie.value);
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { email, password, name, role, clinicId } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(adminUsers)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        name,
        role: role || "admin",
        clinicId: clinicId || null,
      } as any)
      .returning({ id: adminUsers.id });

    return NextResponse.json({
      success: true,
      user: { id: newUser.id, email, name, role: role || "admin" },
    });
  } catch (error: unknown) {
    console.error("[Create User API] Error:", error);
    const message =
      error instanceof Error && error.message.includes("unique")
        ? "Email already registered"
      : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
