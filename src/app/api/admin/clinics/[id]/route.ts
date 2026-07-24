import { db } from "@/db";
import { clinics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// PATCH /api/admin/clinics/[id] — update clinic
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      "name", "slug", "specialty", "description", "phone", "email",
      "city", "state", "street", "addressNumber", "complement", "neighborhood", "zipCode",
      "isVerified", "logoUrl", "coverUrl",
    ];

    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(clinics)
      .set(updates)
      .where(eq(clinics.id, id))
      .returning({ id: clinics.id, name: clinics.name });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[Clinics API] Error updating clinic:", error);
    return NextResponse.json({ error: "Erro ao atualizar clinica" }, { status: 500 });
  }
}

// DELETE /api/admin/clinics/[id] — delete clinic
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(clinics)
      .where(eq(clinics.id, id))
      .returning({ id: clinics.id, name: clinics.name });

    if (!deleted) {
      return NextResponse.json({ error: "Clinica nao encontrada" }, { status: 404 });
    }

    return NextResponse.json({ message: `Clinica "${deleted.name}" excluida` });
  } catch (error) {
    console.error("[Clinics API] Error deleting clinic:", error);
    return NextResponse.json({ error: "Erro ao excluir clinica" }, { status: 500 });
  }
}

// GET /api/admin/clinics/[id] — single clinic
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const [clinic] = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, id))
      .limit(1);

    if (!clinic) {
      return NextResponse.json({ error: "Clinica nao encontrada" }, { status: 404 });
    }

    return NextResponse.json(clinic);
  } catch (error) {
    console.error("[Clinics API] Error fetching clinic:", error);
    return NextResponse.json({ error: "Erro ao buscar clinica" }, { status: 500 });
  }
}
