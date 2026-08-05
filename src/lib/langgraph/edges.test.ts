import {
  routeAfterRouter,
  routeAfterDoubt,
  routeAfterScheduling,
  routeAfterPreAnamnesis,
} from "@/lib/langgraph/edges";
import { ChatStateType } from "@/lib/langgraph/state";

function makeState(
  overrides: Partial<ChatStateType> = {}
): ChatStateType {
  return {
    messages: [],
    platform: "whatsapp",
    userId: "",
    sessionId: "",
    clinicId: "",
    intent: "UNKNOWN",
    calendarId: "",
    professionalName: "",
    preferredDate: null,
    preferredTime: null,
    eventId: null,
    patientData: { collectionComplete: false },
    clinicContext: "",
    completed: false,
    error: null,
    locale: "en",
    ...overrides,
  };
}

describe("routeAfterRouter", () => {
  it("routes QUESTION to doubt_resolution", () => {
    expect(routeAfterRouter(makeState({ intent: "QUESTION" }))).toBe(
      "doubt_resolution"
    );
  });

  it("routes SCHEDULING to scheduling", () => {
    expect(routeAfterRouter(makeState({ intent: "SCHEDULING" }))).toBe(
      "scheduling"
    );
  });

  it("routes CANCELLATION to scheduling", () => {
    expect(routeAfterRouter(makeState({ intent: "CANCELLATION" }))).toBe(
      "scheduling"
    );
  });

  it("routes PRE_ANAMNESIS to pre_anamnesis", () => {
    expect(routeAfterRouter(makeState({ intent: "PRE_ANAMNESIS" }))).toBe(
      "pre_anamnesis"
    );
  });

  it("routes UNKNOWN to doubt_resolution (fallback so the patient still gets a reply)", () => {
    expect(routeAfterRouter(makeState({ intent: "UNKNOWN" }))).toBe(
      "doubt_resolution"
    );
  });
});

describe("routeAfterDoubt", () => {
  it("always routes to END", () => {
    expect(routeAfterDoubt(makeState())).toBe("__end__");
  });
});

describe("routeAfterScheduling", () => {
  it("always routes to END", () => {
    expect(routeAfterScheduling(makeState())).toBe("__end__");
  });
});

describe("routeAfterPreAnamnesis", () => {
  it("always routes to END", () => {
    expect(routeAfterPreAnamnesis(makeState())).toBe("__end__");
  });
});
