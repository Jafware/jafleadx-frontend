import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useBilling } from "@/context/BillingContext";
import { DEFAULT_FOLLOW_UP_STEPS, normalizeSettings } from "@/lib/follow-ups";
import type { AppData, Conversation, ConversationMessage, EntityId, Lead, LeadStatus, Settings } from "@/types/app";

interface CreateLeadInput {
  name: string;
  phone: string;
  source: string;
  status?: LeadStatus;
}

interface AppDataContextValue {
  data: AppData;
  addLead: (lead: CreateLeadInput) => void;
  sendMessage: (conversationId: EntityId, message: string, sender?: "agent" | "ai") => void;
  receiveLeadMessage: (conversationId: EntityId, message: string) => void;
  setConversationMode: (conversationId: EntityId, mode: "ai" | "manual") => void;
  saveSettings: (settings: Settings) => void;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

const DEFAULT_SETTINGS: Settings = {
  businessName: "",
  businessType: "other",
  whatsappNumber: "",
  publicCaptureEnabled: false,
  publicCaptureSiteKey: "",
  publicCaptureAllowedOrigins: [],
  websiteUrl: "",
  websiteKnowledgeText: "",
  websiteKnowledgeUpdatedAt: null,
  websiteKnowledgeError: "",
  tone: "friendly",
  businessDescription: "",
  servicesOffered: "",
  pricingInfo: "",
  targetCustomers: "",
  primaryCTA: "",
  commonObjections: "",
  customInstructions: "",
  automationEnabled: true,
  faqs: [],
  followUps: DEFAULT_FOLLOW_UP_STEPS,
};

const DEFAULT_APP_DATA: AppData = {
  leads: [],
  conversations: [],
  bookings: [],
  settings: DEFAULT_SETTINGS,
};

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatRelativeLabel(date: Date) {
  return "Just now";
}

function appendMessage(
  conversation: Conversation,
  message: ConversationMessage,
  date: Date,
  lastMsg = message.text,
) {
  const isLeadMessage = message.from === "lead";
  const currentFollowUpState = conversation.followUpState ?? { awaitingReplySince: null, sentStepIds: [] };

  return {
    ...conversation,
    unread: isLeadMessage,
    status: isLeadMessage ? ("Active" as const) : ("Pending reply" as const),
    time: formatRelativeLabel(date),
    lastMsg,
    messages: [...conversation.messages, message],
    followUpState: isLeadMessage
      ? {
          ...currentFollowUpState,
          awaitingReplySince: null,
          sentStepIds: [],
          nextFollowUpAt: null,
          lastLeadReplyAt: message.createdAt ?? date.toISOString(),
        }
      : {
          ...currentFollowUpState,
          awaitingReplySince:
            message.kind === "follow-up"
              ? currentFollowUpState.awaitingReplySince ?? message.createdAt ?? date.toISOString()
              : message.createdAt ?? date.toISOString(),
          sentStepIds: message.kind === "follow-up" ? currentFollowUpState.sentStepIds : [],
          nextFollowUpAt: null,
          lastAiReplyAt: senderIsAiMessage(message) ? message.createdAt ?? date.toISOString() : currentFollowUpState.lastAiReplyAt,
        },
  };
}

function senderIsAiMessage(message: ConversationMessage) {
  return message.from === "ai" || Boolean(message.isAi);
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { canAddLead, currentPlan } = useBilling();
  const [data, setData] = useState<AppData>(DEFAULT_APP_DATA);

  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      addLead(lead) {
        const name = lead.name.trim();
        const phone = lead.phone.trim();
        const source = lead.source.trim();

        if (!name || !phone || !source) {
          throw new Error("Name, phone, and source are required.");
        }

        if (!canAddLead(data.leads.length)) {
          const leadLimit = currentPlan.leadLimit ?? "this";
          throw new Error(`Your ${currentPlan.name} plan allows up to ${leadLimit} leads per month. Upgrade to add more leads.`);
        }

        setData((current) => {
          const now = new Date();
          const nextLeadId = Math.max(0, ...current.leads.map((item) => Number(item.id) || 0)) + 1;
          const nextConversationId = Math.max(0, ...current.conversations.map((item) => Number(item.id) || 0)) + 1;
          const newLead: Lead = {
            id: nextLeadId,
            name,
            phone,
            source,
            status: lead.status ?? "New",
            createdAt: now.toISOString(),
            lastContactAt: now.toISOString(),
          };

          const newConversation: Conversation = {
            id: nextConversationId,
            leadId: nextLeadId,
            name,
            channel: source,
            status: "Active",
            mode: "ai",
            unread: false,
            time: formatRelativeLabel(now),
            lastMsg: "Lead added to pipeline",
            followUpState: {
              awaitingReplySince: null,
              sentStepIds: [],
              autopilotEnabled: true,
              autopilotPaused: false,
              nextFollowUpAt: null,
              followUpCount: 0,
              lastFollowUpAt: null,
              lastLeadReplyAt: null,
              lastAiReplyAt: now.toISOString(),
            },
            messages: [
              {
                id: 1,
                from: "ai",
                text: `Lead ${name} was added and is ready for first contact.`,
                time: formatTime(now),
                isAi: true,
                status: "delivered",
                kind: "message",
                createdAt: now.toISOString(),
              },
            ],
          };

          return {
            ...current,
            leads: [newLead, ...current.leads],
            conversations: [newConversation, ...current.conversations],
          };
        });
      },
      sendMessage(conversationId, message, sender = "agent") {
        const text = message.trim();
        if (!text) {
          throw new Error("Message cannot be empty.");
        }

        const now = new Date();

        setData((current) => ({
          ...current,
          conversations: current.conversations.map((conversation) => {
            if (conversation.id !== conversationId) {
              return conversation;
            }

            return appendMessage(
              {
                ...conversation,
                mode: sender === "agent" ? "manual" : conversation.mode ?? "ai",
              },
              {
                id: conversation.messages.length + 1,
                from: sender,
                text,
                time: formatTime(now),
                isAi: sender === "ai",
                status: "read",
                kind: "message",
                createdAt: now.toISOString(),
              },
              now,
            );
          }),
        }));
      },
      receiveLeadMessage(conversationId, message) {
        const text = message.trim();
        if (!text) {
          throw new Error("Message cannot be empty.");
        }

        const now = new Date();

        setData((current) => ({
          ...current,
          conversations: current.conversations.map((conversation) => {
            if (conversation.id !== conversationId) {
              return conversation;
            }

            return appendMessage(
              conversation,
              {
                id: conversation.messages.length + 1,
                from: "lead",
                text,
                time: formatTime(now),
                kind: "message",
                createdAt: now.toISOString(),
              },
              now,
            );
          }),
        }));
      },
      setConversationMode(conversationId, mode) {
        setData((current) => ({
          ...current,
          conversations: current.conversations.map((conversation) =>
            conversation.id === conversationId ? { ...conversation, mode } : conversation,
          ),
        }));
      },
      saveSettings(settings) {
        setData((current) => ({
          ...current,
          settings: normalizeSettings(settings),
        }));
      },
    }),
    [canAddLead, currentPlan.leadLimit, currentPlan.name, data],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used inside AppDataProvider");
  }

  return context;
}
