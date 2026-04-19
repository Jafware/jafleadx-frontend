import type { AppData, Conversation, FollowUpStep, Settings } from "@/types/app";

export const DEFAULT_FOLLOW_UP_STEPS: FollowUpStep[] = [
  {
    id: 1,
    delayHours: 1,
    label: "1 hour",
    message: "Hi {{name}}, just checking in. Let me know if you'd like help with the next step.",
  },
  {
    id: 2,
    delayHours: 24,
    label: "1 day",
    message: "Hi {{name}}, following up in case you still have questions. I'm happy to help.",
  },
  {
    id: 3,
    delayHours: 72,
    label: "3 days",
    message: "Hi {{name}}, I wanted to follow up one last time. If you'd like, I can help you get started today.",
  },
];

function normalizeFollowUpStep(step: Partial<FollowUpStep> | string | undefined, index: number): FollowUpStep {
  const fallback = DEFAULT_FOLLOW_UP_STEPS[index] ?? DEFAULT_FOLLOW_UP_STEPS[DEFAULT_FOLLOW_UP_STEPS.length - 1];

  if (typeof step === "string") {
    return {
      ...fallback,
      message: fallback.message,
      label: fallback.label,
    };
  }

  return {
    id: step?.id ?? fallback.id,
    delayHours: step?.delayHours ?? fallback.delayHours,
    label: step?.label?.trim() || fallback.label,
    message: step?.message?.trim() || fallback.message,
  };
}

export function normalizeSettings(settings: Settings): Settings {
  return {
    ...settings,
    whatsappNumber: settings.whatsappNumber?.trim() || "",
    publicCaptureEnabled: settings.publicCaptureEnabled ?? false,
    publicCaptureSiteKey: settings.publicCaptureSiteKey?.trim() || "",
    publicCaptureAllowedOrigins: Array.from(
      new Set(
        (settings.publicCaptureAllowedOrigins ?? [])
          .map((origin) => origin?.trim?.() || "")
          .filter(Boolean),
      ),
    ),
    automationEnabled: settings.automationEnabled ?? true,
    tone: settings.tone?.trim() || "friendly",
    faqs: settings.faqs ?? [],
    followUps: DEFAULT_FOLLOW_UP_STEPS.map((_, index) => normalizeFollowUpStep(settings.followUps?.[index], index)),
  };
}

export function normalizeConversation(conversation: Conversation): Conversation {
  return {
    ...conversation,
    followUpState: {
      awaitingReplySince: conversation.followUpState?.awaitingReplySince ?? null,
      sentStepIds: conversation.followUpState?.sentStepIds ?? [],
    },
    messages: conversation.messages.map((message) => ({
      ...message,
      kind: message.kind ?? "message",
    })),
  };
}

export function normalizeAppData(data: AppData): AppData {
  return {
    ...data,
    settings: normalizeSettings(data.settings),
    conversations: data.conversations.map(normalizeConversation),
  };
}

export function interpolateFollowUpMessage(template: string, input: { name: string; businessName: string }) {
  return template
    .replaceAll("{{name}}", input.name)
    .replaceAll("{{businessName}}", input.businessName);
}
