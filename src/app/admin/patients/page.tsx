import { getPatients, getPatientCount } from "@/lib/patients";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PatientSearch } from "./PatientSearch";

export const dynamic = "force-dynamic";

const CLINIC_ID = process.env.CLINIC_ID || "default";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  const [patients, totalCount] = await Promise.all([
    getPatients(CLINIC_ID, search, limit, offset),
    getPatientCount(CLINIC_ID),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <PageHeader
        title="Patients"
        description={`${totalCount} patient(s) registered`}
      />

      <PatientSearch initialSearch={search} />

      <Card>
        <CardContent className="p-0">
          {patients.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
              title="No patients found"
              description={search ? "Try a different search term" : "Patients will appear here after their first conversations"}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                      <th className="text-left px-6 py-3 font-medium">Name</th>
                      <th className="text-left px-6 py-3 font-medium">Contact</th>
                      <th className="text-center px-6 py-3 font-medium">Messages</th>
                      <th className="text-left px-6 py-3 font-medium">Last Message</th>
                      <th className="text-right px-6 py-3 font-medium">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {patients.map((patient) => (
                      <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-white flex items-center justify-center text-sm font-semibold">
                              {patient.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="text-gray-900 font-medium">
                                {patient.name || <span className="text-gray-400">Not provided</span>}
                              </p>
                              <p className="text-xs text-gray-500">
                                {patient.email || "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600">
                            {patient.phone || <span className="text-gray-400">—</span>}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="info">{patient.messageCount}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-600 truncate max-w-xs">
                            {patient.lastMessage || <span className="text-gray-400">—</span>}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right text-gray-400 text-xs">
                          {new Date(patient.createdAt).toLocaleDateString("en-US")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <a
                        href={`/admin/patients?page=${page - 1}${search ? `&search=${search}` : ""}`}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
                      >
                        Previous
                      </a>
                    )}
                    {page < totalPages && (
                      <a
                        href={`/admin/patients?page=${page + 1}${search ? `&search=${search}` : ""}`}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-xl hover:bg-gray-50"
                      >
                        Next
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
