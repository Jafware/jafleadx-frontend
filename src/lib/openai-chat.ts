import { apiFetch, buildApiUrl, parseApiJson } from "@/lib/api-client";
import { buildAiRequestPayload } from "@/lib/ai-assistant";
import type { Conversation, Settings } from "@/types/app";

interface AiReplyResponse {
  data?: {
    reply?: string;
  };
  message?: string;
}

function getSafeOpenAiApiUrl(value: string | undefined) {
  const trimmedValue = value?.trim() || "";

  if (!trimmedValue || /\$\{[^}]+\}/.test(trimmedValue)) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedValue)) {
    try {
      const parsedUrl = new URL(trimmedValue);

      if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
        return trimmedValue;
      }
    } catch {
      return "";
    }
  }

  if (trimmedValue.startsWith("/")) {
    return buildApiUrl(trimmedValue);
  }

  return "";
}

export async function requestOpenAiReply(
  settings: Settings,
  conversation: Conversation,
  overrideMessages = conversation.messages,
) {
  const targetUrl = getSafeOpenAiApiUrl(import.meta.env.VITE_OPENAI_API_URL);
  const body = JSON.stringify(buildAiRequestPayload(settings, conversation, overrideMessages));
  const response = targetUrl
    ? await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      })
    : await apiFetch("/api/chat/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      });

  const payload = await parseApiJson<AiReplyResponse>(response);

  if (!response.ok || !payload.data?.reply) {
    throw new Error(payload.message || "OpenAI reply generation failed.");
  }

  return payload.data.reply;
}
