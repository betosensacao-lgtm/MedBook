import { db } from "@/db";
import { adminUsers, clinics, chatSessions, chatMessages, documents } from "@/db/schema";
import { sql, desc, gte } from "drizzle-orm";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ClinicsTable } from "./ClinicsTable";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const [userCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(adminUsers);

  const [clinicCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(clinics);

  const [sessionCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatSessions);

  const [messageCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatMessages);

  const [docCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(documents);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [sessionsToday] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(chatSessions)
    .where(gte(chatSessions.createdAt, today));

  // All clinics
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
      createdAt: clinics.createdAt,
    })
    .from(clinics)
    .orderBy(desc(clinics.createdAt));

  // All users
  const users = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      role: adminUsers.role,
      isActive: adminUsers.isActive,
      clinicId: adminUsers.clinicId,
      lastLoginAt: adminUsers.lastLoginAt,
      createdAt: adminUsers.createdAt,
    })
    .from(adminUsers)
    .orderBy(adminUsers.createdAt);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Super Admin"
        description="Visao completa do sistema MedBook"
      />

      {/* System Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="Usuarios" value={userCount.count} />
        <StatCard label="Clinicas" value={clinicCount.count} />
        <StatCard label="Conversas Hoje" value={sessionsToday.count} variant="highlight" />
        <StatCard label="Total Conversas" value={sessionCount.count} />
        <StatCard label="Mensagens" value={messageCount.count} />
        <StatCard label="Documentos" value={docCount.count} />
      </div>

      {/* Clinic Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Clinicas</h2>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {allClinics.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhuma clinica cadastrada ainda.
            </div>
          ) : (
            <ClinicsTable clinics={allClinics} />
          )}
        </CardContent>
      </Card>

      {/* User Management */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Usuarios do Sistema</h2>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">Nome</th>
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-center px-5 py-3 font-medium">Funcao</th>
                  <th className="text-center px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Ultimo Login</th>
                  <th className="text-right px-5 py-3 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-900 font-medium">{u.name}</td>
                    <td className="px-5 py-3 text-gray-600">{u.email}</td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={u.role === "super_admin" ? "purple" : "info"}>
                        {u.role === "super_admin" ? "Super Admin" : "Admin"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant={u.isActive ? "success" : "danger"}>
                        {u.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Nunca"}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
