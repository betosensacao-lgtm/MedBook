import { db } from "@/db";
import { appointments, users, professionals, triageSessions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Calendar, Clock, User, CheckCircle, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage() {
  let apptList: any[] = [];
  try {
    apptList = await db
      .select({
        id: appointments.id,
        date: appointments.date,
        startTime: appointments.startTime,
        status: appointments.status,
        notes: appointments.notes,
        patientName: users.name,
        patientPhone: users.phone,
        professionalName: professionals.name,
        specialty: professionals.specialty,
      })
      .from(appointments)
      .leftJoin(users, eq(appointments.patientId, users.id))
      .leftJoin(professionals, eq(appointments.professionalId, professionals.id))
      .orderBy(desc(appointments.createdAt))
      .limit(30);
  } catch (error) {
    console.error("[ADMIN APPOINTMENTS ERROR]", error);
  }

  // Also fetch triage sessions
  let triages: any[] = [];
  try {
    triages = await db
      .select()
      .from(triageSessions)
      .orderBy(desc(triageSessions.createdAt))
      .limit(10);
  } catch {}

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda & Consultas Realizadas</h1>
          <p className="text-gray-500 text-sm mt-1">
            Agendamentos e triagens capturados em tempo real via Chat Web e WhatsApp
          </p>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            {apptList.length} consulta(s) no sistema
          </span>
          <span className="text-xs text-teal-600 font-semibold bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
            WhatsApp Sync & Live DB
          </span>
        </div>

        {apptList.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            <Calendar className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-gray-700">Nenhum agendamento realizado ainda</p>
            <p className="text-xs text-gray-400 mt-1">Os agendamentos confirmados pelo chat IA aparecerão aqui em tempo real.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {apptList.map((event) => (
              <div key={event.id} className="p-5 hover:bg-gray-50 transition-colors flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0 font-bold">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{event.notes || "Consulta Médica"}</h3>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1 font-medium text-gray-700">
                        <User className="w-3.5 h-3.5 text-teal-600" />
                        {event.patientName || "Paciente"} {event.patientPhone ? `(${event.patientPhone})` : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {event.date} às {event.startTime}
                      </span>
                      <span className="text-gray-400">| {event.professionalName || "Clínica Geral"}</span>
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
        )}
      </div>

      {/* Triages / Pre-Anamnesis List */}
      {triages.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {triages.length} Pré-Anamnese(s) & Triagens Registradas
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {triages.map((t) => (
              <div key={t.id} className="p-4 hover:bg-gray-50 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{t.patientName} <span className="text-xs font-normal text-gray-500">({t.patientEmail})</span></p>
                  <p className="text-xs text-gray-600 mt-0.5"><span className="font-medium text-teal-700">Sintomas:</span> {t.mainSymptom || "Gerais"}</p>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium border border-emerald-200">
                  Triagem Concluída
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
