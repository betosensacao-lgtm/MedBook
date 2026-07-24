import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET /api/admin/plans — MedBook no longer uses subscription plans
// This endpoint returns an empty array for backwards compatibility
export async function GET() {
  return NextResponse.json([]);
}
