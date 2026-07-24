"use client";

import { useState } from "react";
import { Calendar, Clock, User, CheckCircle } from "lucide-react";

interface AppointmentEvent {
  id: string;
  summary: string;
  patientName: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "cancelled";
}

const DEMO_APPOINTMENTS: AppointmentEvent[] = [
  {
    id: "1",
    summary: "Consulta Inicial - Triagem Geral",
    patientName: "Maria Silva",
    date: "2026-07-25",
    time: "09:00",
    status: "confirmed",
  },
  {
    id: "2",
    summary: "Avaliação Odontológica",
    patientName: "João Santos",
    date: "2026-07-25",
    time: "10:30",
    status: "confirmed",
  },
  {
    id: "3",
    summary: "Retorno Dermatologia",
    patientName: "Ana Oliveira",
    date: "2026-07-25",
    time: "14:00",
    status: "pending",
  },
];

export default function AdminCalendarPage() {
  const [events] = useState<AppointmentEvent[]>(DEMO_APPOINTMENTS);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda de Consultas</h1>
          <p className="text-gray-500 text-sm mt-1">
            Agendamentos capturados via Chat Web e WhatsApp
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {events.length} consulta(s) para hoje
          </span>
          <span className="text-xs text-teal-600 font-medium">Google Calendar Sync Available</span>
        </div>

        <div className="divide-y divide-gray-100">
          {events.map((event) => (
            <div key={event.id} className="p-5 hover:bg-gray-50 transition-colors flex items-center justify-between">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{event.summary}</h3>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {event.patientName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {event.date} às {event.time}
                    </span>
                  </div>
                </div>
              </div>

              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  event.status === "confirmed"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                }`}
              >
                <CheckCircle className="w-3 h-3" />
                {event.status === "confirmed" ? "Confirmado" : "Pendente"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
