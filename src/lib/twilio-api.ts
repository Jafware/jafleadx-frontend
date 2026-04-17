import { apiFetch, parseApiJson } from "@/lib/api-client";
import type { Conversation, EntityId, Settings } from "@/types/app";

export interface TwilioConversationStoreResponse {
  updatedAt: string;
  conversations: Conversation[];
  twilioConfigured?: boolean;
}

export async function fetchTwilioConversations() {
  const response = await apiFetch("/api/chat/conversations");
  const payload = await parseApiJson<{
    data?: TwilioConversationStoreResponse;
    message?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(payload.message || "Unable to load conversations.");
  }

  return payload.data || { updatedAt: new Date().toISOString(), conversations: [], twilioConfigured: false };
}

export async function updateTwilioSettings(settings: Settings) {
  const response = await apiFetch("/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });

  const payload = await parseApiJson<{ message?: string }>(response);

  if (!response.ok) {
    throw new Error(payload.message || "Unable to sync AI settings.");
  }

  return settings;
}

export async function updateTwilioConversationMode(conversationId: EntityId, mode: "ai" | "manual") {
  const response = await apiFetch(`/api/chat/conversations/${encodeURIComponent(String(conversationId))}/mode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ mode }),
  });

  const payload = await parseApiJson<{ message?: string }>(response);

  if (!response.ok) {
    throw new Error(payload.message || "Unable to update conversation mode.");
  }

  return payload;
}

export async function sendTwilioConversationMessage(input: {
  conversationId: EntityId;
  body: string;
  sender?: "agent" | "ai";
}) {
  const response = await apiFetch(`/api/chat/conversations/${encodeURIComponent(String(input.conversationId))}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      body: input.body,
      sender: input.sender,
    }),
  });

  const payload = await parseApiJson<{
    data?: {
      sid?: string;
      conversation?: Conversation;
    };
    message?: string;
  }>(response);

  if (!response.ok) {
    throw new Error(payload.message || "Unable to send WhatsApp message.");
  }

  return payload;
}
