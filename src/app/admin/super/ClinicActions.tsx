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
        toast.success(`"${clinic.name}" atualizada`);
        setShowEdit(false);
        onUpdated();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao atualizar");
      }
    } catch {
      toast.error("Erro ao conectar");
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
        toast.success(`"${clinic.name}" excluida`);
        setShowDelete(false);
        onUpdated();
      } else {
        toast.error("Erro ao excluir");
      }
    } catch {
      toast.error("Erro ao conectar");
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
          Editar
        </button>
        <button
          onClick={() => setShowDelete(true)}
          className="text-xs text-red-500 hover:text-red-600 font-medium"
        >
          Excluir
        </button>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title={`Editar: ${clinic.name}`}>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="verified"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="verified" className="text-sm text-gray-700">Clinica verificada</label>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button loading={saving} onClick={handleUpdate}>Salvar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showDelete} onClose={() => setShowDelete(false)} title={`Excluir ${clinic.name}?`}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Tem certeza? Esta acao nao pode ser desfeita. Todos os dados da clinica serao removidos.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setShowDelete(false)}>Cancelar</Button>
            <Button variant="danger" loading={saving} onClick={handleDelete}>Excluir</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
