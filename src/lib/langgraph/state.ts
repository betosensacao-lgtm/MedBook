import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import type { MetaPlatform } from "@/types/meta";

export type Intent =
  | "QUESTION"
  | "SCHEDULING"
  | "CANCELLATION"
  | "PRE_ANAMNESIS"
  | "UNKNOWN";

export interface PreAnamnesisData {
  fullName?: string;
  phone?: string;
  dateOfBirth?: string;
  chiefComplaint?: string;
  symptomsDescription?: string;
  symptomsDuration?: string;
  currentMedications?: string[];
  allergies?: string[];
  chronicConditions?: string[];
  collectionComplete: boolean;
}

export const ChatState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, prev) => [...curr, ...prev],
    default: () => [],
  }),

  platform: Annotation<MetaPlatform>({
    reducer: (_, prev) => prev,
    default: () => "whatsapp" as MetaPlatform,
  }),

  userId: Annotation<string>({
    reducer: (_, prev) => prev,
    default: () => "",
  }),

  sessionId: Annotation<string>({
    reducer: (_, prev) => prev,
    default: () => "",
  }),

  clinicId: Annotation<string>({
    reducer: (_, prev) => prev,
    default: () => "",
  }),

  intent: Annotation<Intent>({
    reducer: (_, prev) => prev,
    default: () => "UNKNOWN",
  }),

  calendarId: Annotation<string>({
    reducer: (_, prev) => prev,
    default: () => "",
  }),

  professionalName: Annotation<string>({
    reducer: (_, prev) => prev,
    default: () => "",
  }),

  preferredDate: Annotation<string | null>({
    reducer: (_, prev) => prev,
    default: () => null,
  }),

  preferredTime: Annotation<string | null>({
    reducer: (_, prev) => prev,
    default: () => null,
  }),

  eventId: Annotation<string | null>({
    reducer: (_, prev) => prev,
    default: () => null,
  }),

  patientData: Annotation<PreAnamnesisData>({
    reducer: (curr, prev) => ({ ...prev, ...curr }),
    default: () => ({ collectionComplete: false }),
  }),

  clinicContext: Annotation<string>({
    reducer: (_, prev) => prev,
    default: () => "",
  }),

  completed: Annotation<boolean>({
    reducer: (_, prev) => prev,
    default: () => false,
  }),

  error: Annotation<string | null>({
    reducer: (_, prev) => prev,
    default: () => null,
  }),

  locale: Annotation<string>({
    reducer: (_, prev) => prev,
    default: () => "en",
  }),
});

export type ChatStateType = typeof ChatState.State;
