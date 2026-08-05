import { db } from "@/db";
import { clinics, adminUsers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function requireSuperAdmin(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME);
  if (!cookie) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const session = await verifySessionToken(cookie.value).catch(() => null);
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  return null;
}

// GET /api/admin/clinics — list all clinics
export async function GET(request: NextRequest) {
  const authError = await requireSuperAdmin(request);
  if (authError) return authError;

  try {
    const allClinics = await db
      .select({
        id: clinics.id,
        name: clinics.name,
        slug: clinics.slug,
        specialty: clinics.specialty,
        phone: clinics.phone,
        email: clinics.email,
        city: clinics.city,
        state: clinics.state,
        isVerified: clinics.isVerified,
        whatsappVerified: clinics.whatsappVerified,
        createdAt: clinics.createdAt,
      })
      .from(clinics)
      .orderBy(desc(clinics.createdAt));

    return NextResponse.json(allClinics);
  } catch (error) {
    console.error("[Clinics API] Error fetching clinics:", error);
    return NextResponse.json({ error: "Error fetching clinics" }, { status: 500 });
  }
}

// POST /api/admin/clinics — create a new clinic
export async function POST(request: NextRequest) {
  const authError = await requireSuperAdmin(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, slug, specialty, phone, email, city, state } = body;

    if (!name || !slug || !specialty || !phone || !email) {
      return NextResponse.json({ error: "Required fields: name, slug, specialty, phone, email" }, { status: 400 });
    }

    // Get owner (first super_admin)
    const [owner] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.role, "super_admin"))
      .limit(1);

    if (!owner) {
      return NextResponse.json({ error: "No super_admin found" }, { status: 500 });
    }

    const [inserted] = await db
      .insert(clinics)
      .values({
        name,
        slug,
        specialty,
        phone,
        email,
        city: city || null,
        state: state || null,
        ownerId: owner.id,
      } as any)
      .returning({ id: clinics.id });

    return NextResponse.json({ id: inserted.id, message: "Clinic created successfully" }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    if (err?.message?.includes("unique") || err?.code === "23505") {
      return NextResponse.json({ error: "Slug is already in use" }, { status: 409 });
    }
    console.error("[Clinics API] Error creating clinic:", error);
    return NextResponse.json({ error: "Error creating clinic" }, { status: 500 });
  }
}
