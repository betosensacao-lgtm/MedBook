"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Activity, X } from "lucide-react";

export function RealtimeDashboard() {
  const [lastEvent, setLastEvent] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel("medbook-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "medbook", table: "triage_sessions" },
        (payload) => {
          console.log("Change received on triage_sessions!", payload);
          setLastEvent({ type: "triage", data: payload });
          setIsVisible(true);
          toast.info(`Nova atualização na triagem ao vivo!`);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "medbook", table: "appointments" },
        (payload) => {
          console.log("Change received on appointments!", payload);
          setLastEvent({ type: "appointment", data: payload });
          setIsVisible(true);
          toast.success(`Agendamento atualizado ao vivo!`);
        }
      )
      .subscribe((status) => {
        console.log("Supabase Realtime Status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!isVisible || !lastEvent) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/50 p-4 rounded-xl shadow-2xl z-50 animate-in slide-in-from-bottom-4 w-80">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h4 className="text-sm font-semibold text-white">Live Update</h4>
        </div>
        <button onClick={() => setIsVisible(false)} className="text-zinc-400 hover:text-white transition">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="bg-zinc-950 p-2 rounded border border-zinc-800 max-h-40 overflow-auto">
        <pre className="text-xs text-emerald-400 font-mono">
          {JSON.stringify(lastEvent.data.new || lastEvent.data.old, null, 2)}
        </pre>
      </div>
    </div>
  );
}
