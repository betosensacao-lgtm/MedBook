"use client";

import { useState } from "react";
import { MessageSquare, CheckCircle2, ExternalLink, Info } from "lucide-react";

const steps = [
  {
    title: "Create a Meta App",
    description: "Go to Meta Business Manager and create a new App with WhatsApp product enabled.",
    link: "https://developers.facebook.com/apps/",
    linkText: "Open Meta Developers",
  },
  {
    title: "Get your Credentials",
    description:
      "After creating the app, copy the Phone Number ID, Access Token, and App Secret from the WhatsApp > API Setup section.",
    link: "https://developers.facebook.com/docs/whatsapp/cloud-api/get-started",
    linkText: "Setup Guide",
  },
  {
    title: "Configure the Webhook",
    description:
      "In Webhooks settings, point Meta to your deployment URL. The endpoint is /api/webhook. Use your WHATSAPP_VERIFY_TOKEN as the Verify Token.",
    link: "https://developers.facebook.com/docs/graph-api/webhooks",
    linkText: "Webhook Docs",
  },
  {
    title: "Set Environment Variables",
    description:
      "Add WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_VERIFY_TOKEN, WHATSAPP_API_URL, and META_APP_SECRET to your .env.local and Vercel project settings.",
    link: null,
    linkText: null,
  },
  {
    title: "Test the Integration",
    description:
      "Use the Meta test number to send a WhatsApp message to your webhook endpoint. The MedBook AI agent will respond automatically.",
    link: null,
    linkText: null,
  },
];

export default function WhatsAppIntegrationPage() {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-6 h-6 text-green-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Business Integration</h1>
          <p className="text-gray-500 mt-1">
            Connect MedBook to WhatsApp so your AI agent can triage patients and schedule appointments
            directly through messaging.
          </p>
        </div>
      </div>

      {/* Status Banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-5">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Ready for Integration</p>
          <p className="text-sm text-blue-600 mt-1">
            The WhatsApp webhook endpoint is already built and deployed at{" "}
            <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs font-mono">/api/webhook</code>.
            Follow the steps below to connect your Meta Business account.
          </p>
        </div>
      </div>

      {/* What It Does */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">What the WhatsApp Agent Does</h2>
        <div className="space-y-3">
          {[
            "Receives patient messages via WhatsApp Business API",
            "Routes conversations: triage, scheduling, pre-anamnesis, or FAQ",
            "Conducts AI-powered medical triage and urgency classification",
            "Books, confirms, and cancels appointments conversationally",
            "Collects patient pre-anamnesis data before the consultation",
            "Answers clinic-specific questions using the knowledge base",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2.5 text-sm text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Setup Steps */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-6">Setup Checklist</h2>
        <div className="space-y-4">
          {steps.map((step, i) => {
            const done = checkedSteps.has(i);
            return (
              <div
                key={i}
                className={`relative flex gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                  done
                    ? "border-green-200 bg-green-50"
                    : "border-gray-100 bg-gray-50 hover:border-gray-200"
                }`}
                onClick={() => toggle(i)}
              >
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    done ? "border-green-500 bg-green-500" : "border-gray-300"
                  }`}
                >
                  {done && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${done ? "text-green-800 line-through opacity-60" : "text-gray-900"}`}>
                    Step {i + 1}: {step.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-xs text-teal-600 font-medium mt-2 hover:text-teal-700"
                    >
                      {step.linkText}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            {checkedSteps.size}/{steps.length} steps completed
          </p>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${(checkedSteps.size / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Required Variables */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Required Environment Variables</h2>
        <div className="space-y-2">
          {[
            { key: "WHATSAPP_API_URL", value: "https://graph.facebook.com/v21.0" },
            { key: "WHATSAPP_PHONE_NUMBER_ID", value: "From Meta App Settings" },
            { key: "WHATSAPP_ACCESS_TOKEN", value: "From Meta App Settings" },
            { key: "WHATSAPP_VERIFY_TOKEN", value: "Custom string you define" },
            { key: "WHATSAPP_BUSINESS_ACCOUNT_ID", value: "From Meta Business Manager" },
            { key: "META_APP_SECRET", value: "From Meta App Settings" },
          ].map(({ key, value }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <code className="text-xs font-mono text-gray-700 bg-gray-100 px-2 py-1 rounded">{key}</code>
              <span className="text-xs text-gray-400 ml-4 text-right">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
