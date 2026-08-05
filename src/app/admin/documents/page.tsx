import { db } from "@/db";
import { documents } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { DocumentUpload } from "./DocumentUpload";

export const dynamic = "force-dynamic";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentsPage() {
  const docs = await db
    .select()
    .from(documents)
    .orderBy(desc(documents.createdAt));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Documents"
        description="Upload documents to enrich the AI's knowledge base."
      />

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Upload New Document
        </h2>
        <DocumentUpload />
      </Card>

      <Card>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Uploaded Documents
          </h2>
        </div>
        <CardContent className="p-0">
          {docs.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="No documents uploaded yet"
              description="Upload PDFs, DOCX, or TXT for the AI to use as a knowledge base."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {docs.map((doc) => (
                <div key={doc.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                        <p className="text-xs text-gray-500">
                          {doc.fileName} · {formatFileSize(doc.fileSize)} · {doc.chunkCount} chunks
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={doc.status === "ready" ? "success" : doc.status === "error" ? "danger" : "warning"}>
                        {doc.status === "ready" ? "Ready" : doc.status === "error" ? "Error" : "Processing"}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(doc.createdAt).toLocaleDateString("en-US")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
