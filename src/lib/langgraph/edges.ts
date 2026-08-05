import type { ChatStateType } from "./state";

export type NodeName =
  | "router"
  | "doubt_resolution"
  | "scheduling"
  | "pre_anamnesis"
  | "__end__";

export function routeAfterRouter(state: ChatStateType): NodeName {
  switch (state.intent) {
    case "QUESTION":
      return "doubt_resolution";
    case "SCHEDULING":
    case "CANCELLATION":
      return "scheduling";
    case "PRE_ANAMNESIS":
      return "pre_anamnesis";
    default:
      return "doubt_resolution";
  }
}

export function routeAfterDoubt(_state: ChatStateType): NodeName {
  return "__end__";
}

export function routeAfterScheduling(_state: ChatStateType): NodeName {
  return "__end__";
}

export function routeAfterPreAnamnesis(_state: ChatStateType): NodeName {
  return "__end__";
}
