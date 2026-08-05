import { NextRequest, NextResponse } from "next/server";
import { verifyResetToken, markTokenUsed, hashPassword, updatePassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const userId = await verifyResetToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await updatePassword(userId, passwordHash);
    await markTokenUsed(token);

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("[Reset Password API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
