"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";

interface DocumentUploadProps {
  onUploadComplete?: (doc: { id: string; name: string }) => void;
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error uploading file");
        return;
      }

      setSuccess(`File "${file.name}" uploaded successfully!`);
      onUploadComplete?.(data.document);

      // Reset file input
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    } catch {
      setError("Error connecting to the server");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-teal-400 transition-colors">
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.pdf,.docx,.doc"
          onChange={handleUpload}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {uploading ? "Uploading..." : "Click to upload a file"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, DOCX, or TXT (max 10MB)
            </p>
          </div>
        </label>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          {success}
        </div>
      )}
    </div>
  );
}
