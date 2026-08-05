import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, adminUsers, clinics } from "@/db/schema";
import { hashPassword, createSessionToken } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/auth";
import { eq } from "drizzle-orm";

const SPECIALTIES = [
  "general_practice", "dentistry", "aesthetics", "cardiology",
  "dermatology", "neurology", "orthopedics", "ophthalmology",
  "gynecology", "pediatrics", "psychiatry", "other",
] as const;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, clinicName, clinicSpecialty, clinicPhone } = await request.json();

    if (!name || !email || !password || !clinicName || !clinicSpecialty || !clinicPhone) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    if (!SPECIALTIES.includes(clinicSpecialty)) {
      return NextResponse.json({ error: "Invalid specialty" }, { status: 400 });
    }

    const existingEmail = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "This email is already registered" }, { status: 409 });
    }

    let slug = generateSlug(clinicName);
    const existingSlug = await db
      .select()
      .from(clinics)
      .where(eq(clinics.slug, slug))
      .limit(1);

    if (existingSlug.length > 0) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const passwordHash = await hashPassword(password);

    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: email.toLowerCase().trim(),
          name,
          role: "clinic_admin",
          supabaseId: crypto.randomUUID(),
        } as any)
        .returning();

      const [clinic] = await tx
        .insert(clinics)
        .values({
          name: clinicName,
          slug,
          specialty: clinicSpecialty,
          phone: clinicPhone,
          email: email.toLowerCase().trim(),
          ownerId: user.id,
        } as any)
        .returning();

      const [admin] = await tx
        .insert(adminUsers)
        .values({
          email: email.toLowerCase().trim(),
          passwordHash,
          name,
          role: "admin",
          clinicId: clinic.id,
        } as any)
        .returning();

      return { user, clinic, admin };
    });

    const token = await createSessionToken({
      userId: result.admin.id,
      email: result.admin.email,
      role: result.admin.role as "admin" | "super_admin",
      clinicId: result.clinic.id,
    });

    const response = NextResponse.json({
      success: true,
      clinic: { id: result.clinic.id, name: result.clinic.name },
    });

    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error: any) {
    console.error("[Signup API] Error:", error);
    if (error?.message?.includes("unique") || error?.code === "23505") {
      return NextResponse.json({ error: "Email or clinic already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
