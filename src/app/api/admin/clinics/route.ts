import { db } from "@/db";
import { clinics, adminUsers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/admin/clinics — list all clinics
export async function GET() {
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
    return NextResponse.json({ error: "Erro ao buscar clinicas" }, { status: 500 });
  }
}

// POST /api/admin/clinics — create a new clinic
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, slug, specialty, phone, email, city, state } = body;

    if (!name || !slug || !specialty || !phone || !email) {
      return NextResponse.json({ error: "Campos obrigatorios: name, slug, specialty, phone, email" }, { status: 400 });
    }

    // Get owner (first super_admin)
    const [owner] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.role, "super_admin"))
      .limit(1);

    if (!owner) {
      return NextResponse.json({ error: "Nenhum super_admin encontrado" }, { status: 500 });
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

    return NextResponse.json({ id: inserted.id, message: "Clinica criada com sucesso" }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    if (err?.message?.includes("unique") || err?.code === "23505") {
      return NextResponse.json({ error: "Slug ja esta em uso" }, { status: 409 });
    }
    console.error("[Clinics API] Error creating clinic:", error);
    return NextResponse.json({ error: "Erro ao criar clinica" }, { status: 500 });
  }
}
