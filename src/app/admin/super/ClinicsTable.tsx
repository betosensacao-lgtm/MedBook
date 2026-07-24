"use client";

import { useState, useCallback } from "react";
import { ClinicActions } from "./ClinicActions";

interface Clinic {
  id: string;
  name: string;
  slug: string;
  specialty: string;
  phone: string;
  email: string;
  city: string | null;
  state: string | null;
  isVerified: boolean;
  createdAt: Date;
}

export function ClinicsTable({ clinics: initialClinics }: { clinics: Clinic[] }) {
  const [clinics] = useState(initialClinics);

  const handleUpdated = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
            <th className="text-left px-5 py-3 font-medium">Nome</th>
            <th className="text-left px-5 py-3 font-medium">Especialidade</th>
            <th className="text-left px-5 py-3 font-medium">Local</th>
            <th className="text-center px-5 py-3 font-medium">Verif</th>
            <th className="text-right px-5 py-3 font-medium">Criada em</th>
            <th className="text-right px-5 py-3 font-medium">Acoes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {clinics.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-5 py-3">
                <div>
                  <p className="text-gray-900 font-medium">{c.name}</p>
                  <p className="text-xs text-gray-400">/{c.slug}</p>
                </div>
              </td>
              <td className="px-5 py-3 text-gray-600 text-xs">
                {c.specialty}
              </td>
              <td className="px-5 py-3 text-gray-500 text-xs">
                {[c.city, c.state].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-5 py-3 text-center">
                {c.isVerified ? (
                  <svg className="w-4 h-4 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-300 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </td>
              <td className="px-5 py-3 text-right text-gray-400 text-xs">
                {new Date(c.createdAt).toLocaleDateString("pt-BR")}
              </td>
              <td className="px-5 py-3 text-right">
                <ClinicActions clinic={c} onUpdated={handleUpdated} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
