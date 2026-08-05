"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PatientSearchProps {
  initialSearch: string;
}

export function PatientSearch({ initialSearch }: PatientSearchProps) {
  const [search, setSearch] = useState(initialSearch);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    router.push(`/admin/patients?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="relative flex-1">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or email..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors"
      >
        Search
      </button>
      {initialSearch && (
        <a
          href="/admin/patients"
          className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          Clear
        </a>
      )}
    </form>
  );
}
