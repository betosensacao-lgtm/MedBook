import { NextRequest, NextResponse } from "next/server";
import { getAdminByEmail, createResetToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await getAdminByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If the email is registered, you will receive a reset link.",
      });
    }

    const resetToken = await createResetToken(user.id);

    // TODO: send the reset link by email (RESEND_API_KEY/EMAIL_FROM are already
    // configured for this project — wire this up instead of relying on dev logging).
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Password Reset] Token for ${email}: ${resetToken}`);
      console.log(`[Password Reset] Reset URL: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/reset-password?token=${resetToken}`);
    }

    return NextResponse.json({
      success: true,
      message: "If the email is registered, you will receive a reset link.",
      // Include token in dev mode for testing
      ...(process.env.NODE_ENV !== "production" && { resetToken }),
    });
  } catch (error) {
    console.error("[Forgot Password API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
