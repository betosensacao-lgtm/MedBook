"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "sonner";

interface Clinic {
  id: string;
  name: string;
  isVerified: boolean;
}

interface ClinicActionsProps {
  clinic: Clinic;
  onUpdated: () => void;
}

export function ClinicActions({ clinic, onUpdated }: ClinicActionsProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isVerified, setIsVerified] = useState(clinic.isVerified);
  const [saving, setSaving] = useState(false);

  async function handleUpdate() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clinics/${clinic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isVerified,
        }),
      });

      if (res.ok) {
        toast.success(`"${clinic.name}" updated`);
        setShowEdit(false);
        onUpdated();
      } else {
        const data = await res.json();
        toast.error(data.error || "Error updating");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clinics/${clinic.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(`"${clinic.name}" deleted`);
        setShowDelete(false);
        onUpdated();
      } else {
        toast.error("Error deleting");
      }
    } catch {
      toast.error("Connection error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setShowEdit(true)}
          className="text-xs text-teal-600 hover:text-teal-700 font-medium"
        >
          Edit
        </button>
        <button
          onClick={() => setShowDelete(true)}
          className="text-xs text-red-500 hover:text-red-600 font-medium"
        >
          Delete
        </button>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Edit: ${clinic.name}`}>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="verified"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="verified" className="text-sm text-gray-700">Verified clinic</label>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleUpdate}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title={`Delete ${clinic.name}?`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure? This action cannot be undone. All data for this clinic will be removed.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="danger" loading={saving} onClick={handleDelete}>Delete</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
