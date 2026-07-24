"use client";

import { useState, useEffect } from "react";
import type { CalendarEvent } from "@/lib/calendar/types";

export default function AdminCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/calendar/events")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setEvents(data.events || []);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendário de Agendamentos</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 mb-6">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            {loading ? "Carregando..." : `${events.length} consulta(s) agendada(s)`}
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Carregando eventos...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Nenhuma consulta agendada nos próximos dias.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {events.map((event) => (
              <div key={event.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{event.summary}</h3>
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      event.status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {event.status === "cancelled" ? "Cancelado" : "Confirmado"}
                  </span>
                </div>
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  <span>
                    {new Date(event.start.dateTime).toLocaleDateString("pt-BR")}
                  </span>
                  <span>
                    {new Date(event.start.dateTime).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    -{" "}
                    {new Date(event.end.dateTime).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {event.attendees && event.attendees.length > 0 && (
                  <div className="mt-2 text-sm text-gray-500">
                    {event.attendees.map((a) => (
                      <span key={a.email}>
                        {a.displayName || a.email}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
