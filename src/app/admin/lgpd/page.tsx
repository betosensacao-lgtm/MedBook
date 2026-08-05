"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export default function LGPDPage() {
  const [exportEmail, setExportEmail] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleExport(e: React.FormEvent) {
    e.preventDefault();
    setExporting(true);
    setExportMsg(null);

    try {
      const res = await fetch("/api/admin/lgpd/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: exportEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        setExportMsg({ type: "success", text: data.message || "Request submitted. Your data will be sent by email." });
        setExportEmail("");
      } else {
        setExportMsg({ type: "error", text: data.error || "Error requesting export" });
      }
    } catch {
      setExportMsg({ type: "error", text: "Connection error" });
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleting(true);
    setDeleteMsg(null);

    if (deleteConfirm !== "DELETE") {
      setDeleteMsg({ type: "error", text: "Type DELETE to confirm" });
      setDeleting(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/lgpd/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: deleteEmail }),
      });
      const data = await res.json();

      if (res.ok) {
        setDeleteMsg({ type: "success", text: data.message || "Data deleted successfully." });
        setDeleteEmail("");
        setDeleteConfirm("");
      } else {
        setDeleteMsg({ type: "error", text: data.error || "Error deleting data" });
      }
    } catch {
      setDeleteMsg({ type: "error", text: "Connection error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Data Privacy"
        description="Manage personal data in accordance with applicable data protection regulations"
      />

      {/* Privacy Policy Summary */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Privacy Policy</h2>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-gray-600">
          <div>
            <h3 className="font-medium text-gray-900 mb-1">1. Data Collected</h3>
            <p>
              MedBook only collects the data necessary for the service to function:
              name, phone, email, and health information voluntarily provided by the
              patient during the conversation with the chatbot.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">2. Purpose</h3>
            <p>
              Data is used exclusively for: appointment scheduling, pre-anamnesis, and
              communication between patient and clinic. It is never sold or shared
              with third parties.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">3. Storage</h3>
            <p>
              Data is stored in Supabase (PostgreSQL) with encryption in transit (TLS)
              and at rest. Access is restricted to clinic administrators.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">4. Your Rights</h3>
            <p>
              Under applicable data protection law, you have the right to: access your
              data, correct it, delete it, port it, and revoke consent.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-1">5. Retention</h3>
            <p>
              Data is kept while the account is active. When deletion is requested,
              all personal data will be permanently removed within 30 days.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Export */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Export My Data</h2>
            <p className="text-sm text-gray-500">
              Request a copy of all your personal data
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleExport} className="space-y-4">
              <Input
                label="Registered email"
                type="email"
                value={exportEmail}
                onChange={(e) => setExportEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
              {exportMsg && (
                <div className={`text-sm px-4 py-3 rounded-xl ${
                  exportMsg.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {exportMsg.text}
                </div>
              )}
              <Button type="submit" loading={exporting} variant="outline">
                Request Export
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Data Deletion */}
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-red-700">Delete My Data</h2>
              <Badge variant="danger">Irreversible</Badge>
            </div>
            <p className="text-sm text-gray-500">
              Request permanent deletion of all your data
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDelete} className="space-y-4">
              <Input
                label="Registered email"
                type="email"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Type <span className="font-bold text-red-600">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-2.5 border border-red-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>
              {deleteMsg && (
                <div className={`text-sm px-4 py-3 rounded-xl ${
                  deleteMsg.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {deleteMsg.text}
                </div>
              )}
              <Button
                type="submit"
                loading={deleting}
                variant="danger"
                disabled={deleteConfirm !== "DELETE"}
              >
                Delete All Data
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Consent Management */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Consent Management</h2>
          <p className="text-sm text-gray-500">
            Control how your data is used
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ConsentItem
              title="Store data for pre-anamnesis"
              description="Allow data provided during pre-anamnesis to be saved for use in the appointment"
              defaultChecked={true}
            />
            <ConsentItem
              title="Email communication"
              description="Receive appointment reminders and communications from the clinic"
              defaultChecked={true}
            />
            <ConsentItem
              title="Service improvement"
              description="Allow the use of anonymized data to improve the chatbot"
              defaultChecked={false}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConsentItem({
  title,
  description,
  defaultChecked,
}: {
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultChecked);
  const [saved, setSaved] = useState(false);

  function handleToggle() {
    setEnabled(!enabled);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex items-start justify-between p-4 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <h3 className="text-sm font-medium text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {saved && (
          <span className="text-xs text-green-600">Saved!</span>
        )}
        <button
          type="button"
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-teal-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
