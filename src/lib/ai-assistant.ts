import type { Conversation, ConversationMessage, Settings } from "@/types/app";

interface BusinessProfile {
  label: string;
  qualificationFocus: string[];
  bookingGoal: string;
}

const businessProfiles: Record<string, BusinessProfile> = {
  real_estate: {
    label: "Real Estate",
    qualificationFocus: [
      "preferred property type",
      "target location",
      "budget range",
      "desired timeline",
    ],
    bookingGoal: "Schedule a viewing, consultation, or discovery call.",
  },
  gym: {
    label: "Gym / Fitness",
    qualificationFocus: [
      "fitness goal",
      "membership preference",
      "training experience",
      "preferred class or coaching format",
    ],
    bookingGoal: "Guide the lead toward a trial session, consultation, or membership tour.",
  },
  clinic: {
    label: "Clinic / Healthcare",
    qualificationFocus: [
      "service needed",
      "symptom or concern",
      "urgency",
      "preferred appointment time",
    ],
    bookingGoal: "Guide the lead toward booking an appointment or consultation.",
  },
  other: {
    label: "General Business",
    qualificationFocus: [
      "their main need",
      "timeline",
      "budget or package fit",
      "best next step",
    ],
    bookingGoal: "Guide the lead toward a booked meeting or clear next step.",
  },
};

function getBusinessProfile(businessType: string): BusinessProfile {
  return businessProfiles[businessType] ?? businessProfiles.other;
}

function formatFaqs(settings: Settings) {
  const items = settings.faqs
    .filter((faq) => faq.question.trim() && faq.answer.trim())
    .map((faq) => `- ${faq.question.trim()}: ${faq.answer.trim()}`);

  return items.length > 0 ? items.join("\n") : "- No FAQs provided.";
}

function normalizeMessageRole(message: ConversationMessage) {
  return message.from === "lead" ? "user" : "assistant";
}

function formatConversation(messages: ConversationMessage[]) {
  return messages.map((message) => ({
    role: normalizeMessageRole(message),
    content: message.text,
  }));
}

export function buildAssistantInstructions(settings: Settings) {
  const profile = getBusinessProfile(settings.businessType);

  return [
    `You are the WhatsApp sales assistant for ${settings.businessName || "the business"}.`,
    `Business type: ${profile.label}.`,
    `Business description: ${settings.businessDescription || "No description provided."}`,
    `Tone: ${settings.tone || "friendly"}.`,
    `Your job is to sound human, not robotic.`,
    `Ask at most one qualification question per reply, and only ask it if that information is still missing.`,
    `Qualification priorities: ${profile.qualificationFocus.join(", ")}.`,
    `Primary conversion goal: ${profile.bookingGoal}`,
    "Keep replies concise, natural, and conversational for WhatsApp.",
    "Acknowledge the lead's latest message before guiding them.",
    "When enough qualification is collected, move the conversation toward booking with a clear next step.",
    "Do not invent discounts, policies, or availability.",
    "Use the FAQ knowledge when relevant:",
    formatFaqs(settings),
  ].join("\n");
}

export function buildConversationInput(conversation: Conversation, overrideMessages?: ConversationMessage[]) {
  return formatConversation(overrideMessages ?? conversation.messages);
}

export function buildAiRequestPayload(
  settings: Settings,
  conversation: Conversation,
  overrideMessages?: ConversationMessage[],
) {
  return {
    settings,
    conversation: {
      id: conversation.id,
      name: conversation.name,
      channel: conversation.channel,
      mode: conversation.mode ?? "ai",
      messages: overrideMessages ?? conversation.messages,
    },
  };
}
