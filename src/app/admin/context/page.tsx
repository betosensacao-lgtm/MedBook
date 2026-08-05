import { getAllContext } from "@/lib/rag/knowledge-base";
import { ContextForm } from "./ContextForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

const CLINIC_ID = process.env.CLINIC_ID || "default";

export default async function AdminContextPage() {
  let entries: Awaited<ReturnType<typeof getAllContext>> = [];
  let error: string | null = null;

  try {
    entries = await getAllContext(CLINIC_ID);
  } catch (e) {
    error = e instanceof Error ? e.message : "Error loading context";
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Clinic Context"
        description="Manage the information the AI uses to respond to patients."
      />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-800">
          {error}
        </div>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Add / Update Information
        </h2>
        <ContextForm clinicId={CLINIC_ID} />
      </Card>

      <Card>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Registered Information
          </h2>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
            title="No information registered yet"
            description="Use the form above to add information the AI will use to respond."
          />
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((entry) => (
              <div key={entry.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 capitalize">
                      {entry.key.replace(/_/g, " ")}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                      {entry.content}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Updated on{" "}
                  {new Date(entry.updatedAt).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
