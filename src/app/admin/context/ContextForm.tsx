"use client";

import { useState } from "react";
import { upsertContextEntry } from "./actions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

const PRESET_KEYS = [
  "business_hours",
  "accepted_insurance",
  "services_offered",
  "location",
  "rules_and_policies",
  "general_information",
];

const KEY_LABELS: Record<string, string> = {
  business_hours: "Business Hours",
  accepted_insurance: "Accepted Insurance",
  services_offered: "Services Offered",
  location: "Location & Contact",
  rules_and_policies: "Rules & Policies",
  general_information: "General Information",
};

interface Props {
  clinicId: string;
}

export function ContextForm({ clinicId }: Props) {
  const [key, setKey] = useState("");
  const [content, setContent] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const finalKey = useCustom ? customKey.trim() : key;
    if (!finalKey || !content.trim()) {
      setMessage({ type: "error", text: "Fill in all fields." });
      setSaving(false);
      return;
    }

    try {
      await upsertContextEntry(clinicId, finalKey, content.trim());
      setMessage({ type: "success", text: "Information saved successfully!" });
      setContent("");
      setCustomKey("");
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Error saving.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Information Type
        </label>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setUseCustom(false)}
            className={`px-4 py-1.5 text-sm rounded-xl border transition-colors ${
              !useCustom
                ? "bg-teal-50 border-teal-300 text-teal-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            Preset
          </button>
          <button
            type="button"
            onClick={() => setUseCustom(true)}
            className={`px-4 py-1.5 text-sm rounded-xl border transition-colors ${
              useCustom
                ? "bg-teal-50 border-teal-300 text-teal-700"
                : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            Custom
          </button>
        </div>

        {useCustom ? (
          <Input
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            placeholder="E.g.: promotions, important_notices"
          />
        ) : (
          <select
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          >
            <option value="">Select...</option>
            {PRESET_KEYS.map((k) => (
              <option key={k} value={k}>
                {KEY_LABELS[k]}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Content
        </label>
        <p className="text-xs text-gray-400 mb-2">
          Write in free text. The AI will use this information to respond to patients.
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          placeholder="E.g.: We're open Monday to Friday from 8am to 6pm and Saturday from 8am to noon..."
          className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y transition-all"
        />
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-xl text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <Button type="submit" loading={saving} disabled={!content.trim()}>
        Save
      </Button>
    </form>
  );
}
