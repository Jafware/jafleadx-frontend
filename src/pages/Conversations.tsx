import { AppLayout } from "@/components/AppLayout";
import { useAppData } from "@/context/AppDataContext";
import { useBilling } from "@/context/BillingContext";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { requestOpenAiReply } from "@/lib/openai-chat";
import { fetchTwilioConversations, sendTwilioConversationMessage, updateTwilioConversationMode } from "@/lib/twilio-api";
import { Bot, CheckCheck, MessageCircleMore, PanelLeftOpen, Search, Send, Sparkles, UserRound, WandSparkles } from "lucide-react";
import { FormEvent, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Conversation, ConversationMessage, EntityId } from "@/types/app";

const simulatedLeadPrompts = [
  "Can you share pricing for the premium package?",
  "Is there a slot available tomorrow afternoon?",
  "I need help comparing the starter and growth plans.",
];

function MessageStatus({ status }: { status?: "sending" | "sent" | "delivered" | "read" }) {
  if (!status) {
    return null;
  }

  if (status === "sending") {
    return <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Sending</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-0.5 text-[10px]", status === "read" ? "text-sky-300" : "text-muted-foreground")}>
      <CheckCheck className="h-3 w-3" />
    </span>
  );
}

interface ChatSendApiResponse {
  data?: {
    conversationId?: string;
    message?: ConversationMessage;
    response?: ConversationMessage;
  };
  message?: string;
}

function createLocalChatMessage(
  from: ConversationMessage["from"],
  text: string,
  options?: Partial<ConversationMessage>,
): ConversationMessage {
  const createdAt = new Date();

  return {
    id: createdAt.getTime(),
    from,
    text,
    time: createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    createdAt: createdAt.toISOString(),
    kind: "message",
    ...options,
  };
}

export default function Conversations() {
  const { data, receiveLeadMessage, sendMessage, setConversationMode } = useAppData();
  const { hasFeature } = useBilling();
  const [selected, setSelected] = useState<EntityId>(data.conversations[0]?.id ?? 0);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [typingConversationId, setTypingConversationId] = useState<EntityId | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [serverConversations, setServerConversations] = useState<Conversation[]>([]);
  const [twilioConfigured, setTwilioConfigured] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [syncIssue, setSyncIssue] = useState<string | null>(null);
  const [conversationOverrides, setConversationOverrides] = useState<Record<string, Partial<Conversation>>>({});
  const lastSyncedAtRef = useRef<string | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const deferredSearch = useDeferredValue(search);

  const baseConversationSource = twilioConfigured && serverConversations.length > 0 ? serverConversations : data.conversations;
  const conversationSource = useMemo(
    () =>
      baseConversationSource.map((conversation) => {
        const override = conversationOverrides[conversation.id];

        return override
          ? {
              ...conversation,
              ...override,
              messages: override.messages ?? conversation.messages,
            }
          : conversation;
      }),
    [baseConversationSource, conversationOverrides],
  );

  const conversations = useMemo(
    () =>
      conversationSource.filter((conversation) =>
        [conversation.name, conversation.lastMsg, conversation.channel].some((value) =>
          value.toLowerCase().includes(deferredSearch.toLowerCase()),
        ),
      ),
    [conversationSource, deferredSearch],
  );

  const activeConversation =
    conversations.find((conversation) => conversation.id === selected) ??
    conversationSource.find((conversation) => conversation.id === selected) ??
    conversations[0];

  useEffect(() => {
    if (!activeConversation) {
      return;
    }

    setSelected(activeConversation.id);
  }, [activeConversation]);

  useEffect(() => {
    if (!scrollRef.current) {
      return;
    }

    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [activeConversation?.messages.length, typingConversationId]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    const scheduleNextSync = (delayMs: number) => {
      if (cancelled) {
        return;
      }

      timeoutId = window.setTimeout(() => {
        void sync(false);
      }, delayMs);
    };

    const sync = async (showLoader = false) => {
      let nextDelay = 1200;

      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        scheduleNextSync(5000);
        return;
      }

      if (showLoader) {
        setIsSyncing(true);
      }

      try {
        const payload = await fetchTwilioConversations();
        if (!cancelled) {
          const hasChanges = payload.updatedAt !== lastSyncedAtRef.current;

          setTwilioConfigured(Boolean(payload.twilioConfigured));
          if (hasChanges || showLoader) {
            setServerConversations(payload.conversations);
            lastSyncedAtRef.current = payload.updatedAt;
          }
          setSyncIssue(null);
        }
      } catch {
        if (!cancelled) {
          setTwilioConfigured(false);
          setSyncIssue("Live sync is temporarily unavailable. Showing local conversation state.");
        }
        nextDelay = 4000;
      } finally {
        if (!cancelled && showLoader) {
          setIsSyncing(false);
        }

        scheduleNextSync(nextDelay);
      }
    };

    void sync(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
        void sync(false);
      }
    };

    const handleFocus = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      void sync(false);
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const triggerAiReply = async (conversationId: EntityId, overrideMessages?: ConversationMessage[]) => {
    const matchingConversation = conversationSource.find((conversation) => conversation.id === conversationId);
    if (!matchingConversation || matchingConversation.mode === "manual") {
      return;
    }

    setTypingConversationId(conversationId);

    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = window.setTimeout(async () => {
      try {
        const reply = await requestOpenAiReply(data.settings, matchingConversation, overrideMessages);
        sendMessage(conversationId, reply, "ai");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to generate AI reply.");
      } finally {
        setTypingConversationId((current) => (current === conversationId ? null : current));
      }
    }, 600);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!activeConversation || !input.trim() || isSending) {
      return;
    }

    const message = input.trim();
    const optimisticLeadMessage = createLocalChatMessage("lead", message, {
      status: "sending",
    });
    setIsSending(true);
    setInput("");
    setConversationOverrides((current) => ({
      ...current,
      [activeConversation.id]: {
        ...current[activeConversation.id],
        status: "Active",
        unread: false,
        time: "Just now",
        lastMsg: message,
        messages: [...activeConversation.messages, optimisticLeadMessage],
      },
    }));

    void (async () => {
      try {
        const response = await apiFetch("/api/chat/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leadId: String(activeConversation.leadId),
            message,
          }),
        });
        const payload = await parseApiJson<ChatSendApiResponse>(response);

        if (!response.ok) {
          throw new Error(payload.message || "Unable to send message through chat API.");
        }

        const savedLeadMessage =
          payload.data?.message ||
          createLocalChatMessage("lead", message, {
            status: "sent",
          });
        const savedAiMessage =
          payload.data?.response ||
          createLocalChatMessage("ai", "AI reply received.", {
            isAi: true,
            status: "read",
          });

        setConversationOverrides((current) => ({
          ...current,
          [activeConversation.id]: {
            ...current[activeConversation.id],
            status: "Pending reply",
            unread: false,
            time: "Just now",
            lastMsg: savedAiMessage.text,
            messages: [...activeConversation.messages, savedLeadMessage, savedAiMessage],
          },
        }));

        toast.success("Message sent and AI response received.");
      } catch (apiError) {
        try {
          await sendTwilioConversationMessage({
            conversationId: activeConversation.id,
            body: message,
            sender: "agent",
          });

          const payload = await fetchTwilioConversations();
          setTwilioConfigured(Boolean(payload.twilioConfigured));
          setServerConversations(payload.conversations);
          lastSyncedAtRef.current = payload.updatedAt;
          setConversationOverrides((current) => {
            const next = { ...current };
            delete next[activeConversation.id];
            return next;
          });
          toast.success("Manual reply sent.");
        } catch (fallbackError) {
          setConversationOverrides((current) => {
            const next = { ...current };
            delete next[activeConversation.id];
            return next;
          });
          toast.error(
            fallbackError instanceof Error
              ? fallbackError.message
              : apiError instanceof Error
                ? apiError.message
                : "Unable to send message.",
          );
        }
      } finally {
        setIsSending(false);
      }
    })();
  };

  const handleSimulateLead = () => {
    if (!activeConversation) {
      return;
    }

    const message =
      simulatedLeadPrompts[activeConversation.messages.length % simulatedLeadPrompts.length];
    const nextMessage: ConversationMessage = {
      id: activeConversation.messages.length + 1,
      from: "lead",
      text: message,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    };

    try {
      if (twilioConfigured && serverConversations.length > 0) {
        toast.message("Use the Twilio webhook to test real inbound WhatsApp messages.");
      } else {
        receiveLeadMessage(activeConversation.id, message);
        void triggerAiReply(activeConversation.id, [...activeConversation.messages, nextMessage]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to simulate incoming message.");
    }
  };

  const handleDraftWithAi = async () => {
    if (!activeConversation) {
      return;
    }

    if (!hasFeature("aiDrafts")) {
      toast.error("AI draft assist is available on Growth and Pro plans.");
      return;
    }

    setIsGeneratingDraft(true);

    try {
      const reply = await requestOpenAiReply(data.settings, activeConversation);
      setInput(reply);
      toast.success("AI draft added to the composer.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to draft AI reply.");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const activeMode = activeConversation?.mode ?? "ai";
  const canUseAiDrafts = hasFeature("aiDrafts");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-foreground">Conversations</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
              WhatsApp-style inbox with a conversation list on the left and a live chat workspace on the right.
            </p>
          </div>
          <div
            className="flex items-center gap-2 self-start rounded-full border border-border/80 bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI can draft in real time while your team overrides anytime.
          </div>
        </div>

        <div
          className="overflow-hidden rounded-[34px] border border-border/80 bg-[#0b141a]"
          style={{ boxShadow: "var(--shadow-card)", height: "calc(100vh - 220px)" }}
        >
          <div className="flex h-full">
            <aside
              className={cn(
                "absolute inset-y-0 left-0 z-20 w-full max-w-sm border-r border-white/5 bg-[#111b21] transition-transform md:static md:w-[360px] md:translate-x-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
              )}
            >
              <div className="border-b border-white/5 bg-[linear-gradient(180deg,#202c33,#1b262d)] px-4 py-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2a3942] text-slate-100 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
                      <MessageCircleMore className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold tracking-[-0.01em] text-white">Chats</p>
                      <p className="text-xs text-slate-400">
                        {conversationSource.length} active threads{isSyncing ? " • syncing" : twilioConfigured ? " • Twilio live" : ""}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-slate-300 hover:bg-white/5 hover:text-white md:hidden"
                    onClick={() => setSidebarOpen(false)}
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </Button>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search or start new chat"
                    className="h-11 rounded-2xl border-white/5 bg-[#111b21] pl-9 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="h-[calc(100%-97px)] overflow-y-auto bg-[#111b21]">
                {syncIssue ? (
                  <div className="border-b border-white/5 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
                    {syncIssue}
                  </div>
                ) : null}
                {conversations.map((conversation) => {
                  const isActive = conversation.id === activeConversation?.id;

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => {
                        setSelected(conversation.id);
                        setSidebarOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-white/5 px-4 py-4 text-left transition-all duration-200",
                        isActive ? "bg-[linear-gradient(180deg,rgba(31,44,51,0.98),rgba(27,38,45,0.98))]" : "hover:bg-white/[0.03]",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-2xl text-slate-100 transition-colors",
                          isActive ? "bg-[#314750]" : "bg-[#2a3942]",
                        )}
                      >
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-semibold tracking-[-0.01em] text-white">{conversation.name}</p>
                          <span className="shrink-0 text-[11px] text-slate-400">{conversation.time}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <p className="truncate text-xs leading-5 text-slate-400">{conversation.lastMsg}</p>
                          <div className="flex items-center gap-2">
                            {conversation.mode === "manual" ? (
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                                Manual
                              </span>
                            ) : null}
                            {conversation.unread ? <span className="h-2.5 w-2.5 rounded-full bg-[#25d366]" /> : null}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {conversations.length === 0 ? (
                  <div className="px-6 py-10 text-center text-sm text-slate-400">No conversations match your search.</div>
                ) : null}
              </div>
            </aside>

            <div className="relative flex min-w-0 flex-1 flex-col bg-[#0b141a]">
              {activeConversation ? (
                <>
                  <div className="flex items-center gap-3 border-b border-white/5 bg-[linear-gradient(180deg,#202c33,#1b262d)] px-4 py-3.5 sm:px-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-slate-300 hover:bg-white/5 hover:text-white md:hidden"
                      onClick={() => setSidebarOpen(true)}
                    >
                      <PanelLeftOpen className="h-4 w-4" />
                    </Button>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2a3942] text-slate-100">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-[-0.01em] text-white">{activeConversation.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {typingConversationId === activeConversation.id ? "AI is typing..." : `${activeConversation.channel} • ${activeConversation.status}`}
                      </p>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <Button
                        type="button"
                        variant={activeMode === "ai" ? "default" : "secondary"}
                        className={cn(activeMode === "ai" ? "bg-[#25d366] text-[#10261c] hover:bg-[#25d366]/90" : "bg-[#2a3942] text-slate-200 hover:bg-[#33454f]")}
                        onClick={() => {
                          setConversationMode(activeConversation.id, "ai");
                          setServerConversations((current) =>
                            current.map((conversation) =>
                              conversation.id === activeConversation.id ? { ...conversation, mode: "ai" } : conversation,
                            ),
                          );
                          if (twilioConfigured && serverConversations.length > 0) {
                            void updateTwilioConversationMode(activeConversation.id, "ai").catch(() => {
                              toast.error("Unable to sync AI autopilot state to the server.");
                            });
                          }
                          toast.success("AI autopilot enabled.");
                        }}
                      >
                        <Bot className="mr-2 h-4 w-4" />
                        AI Autopilot
                      </Button>
                      <Button
                        type="button"
                        variant={activeMode === "manual" ? "default" : "secondary"}
                        className={cn(activeMode === "manual" ? "bg-amber-400 text-[#2d1c02] hover:bg-amber-300" : "bg-[#2a3942] text-slate-200 hover:bg-[#33454f]")}
                        onClick={() => {
                          setConversationMode(activeConversation.id, "manual");
                          setServerConversations((current) =>
                            current.map((conversation) =>
                              conversation.id === activeConversation.id ? { ...conversation, mode: "manual" } : conversation,
                            ),
                          );
                          if (twilioConfigured && serverConversations.length > 0) {
                            void updateTwilioConversationMode(activeConversation.id, "manual").catch(() => {
                              toast.error("Unable to sync manual override state to the server.");
                            });
                          }
                          setTypingConversationId((current) => (current === activeConversation.id ? null : current));
                          toast.success("Manual override enabled.");
                        }}
                      >
                        <WandSparkles className="mr-2 h-4 w-4" />
                        Manual Override
                      </Button>
                    </div>
                  </div>

                  <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto scroll-smooth bg-[#0b141a] px-4 py-7 sm:px-6 sm:py-8"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 20% 20%, rgba(37, 211, 102, 0.06), transparent 22%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.04), transparent 18%), linear-gradient(rgba(11,20,26,0.92), rgba(11,20,26,0.96)), linear-gradient(135deg, rgba(255,255,255,0.018) 25%, transparent 25%)",
                      backgroundSize: "auto, auto, auto, 22px 22px",
                    }}
                  >
                    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
                      <div className="mx-auto rounded-full border border-white/5 bg-[#1f2c34]/95 px-3.5 py-1 text-[11px] font-medium tracking-[0.12em] text-slate-300">
                        Conversation history
                      </div>

                      {activeConversation.messages.map((message) => {
                        const isIncoming = message.from === "lead";
                        const bubbleTone = isIncoming
                          ? "bg-[linear-gradient(180deg,#202c33,#1a262d)] text-slate-100 rounded-bl-md border border-white/5"
                          : message.from === "agent"
                            ? "bg-[linear-gradient(180deg,#0a6c59,#005c4b)] text-white rounded-br-md border border-[#1b7d69]/40"
                            : "bg-[linear-gradient(180deg,#123d2f,#103529)] text-[#dffbe5] border border-[#1b644d] rounded-br-md";

                        return (
                          <div key={message.id} className={cn("flex", isIncoming ? "justify-start pr-10" : "justify-end pl-10")}>
                            <div className="flex max-w-[88%] flex-col gap-1 sm:max-w-[76%]">
                              <div className={cn("rounded-[24px] px-4 py-3.5 shadow-[0_14px_35px_rgba(0,0,0,0.16)]", bubbleTone)}>
                              {message.isAi ? (
                                <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-100">
                                  <Bot className="h-3 w-3" />
                                  AI reply
                                </span>
                              ) : null}
                              {message.from === "agent" ? (
                                <span className="mb-1 inline-flex rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/85">
                                  Manual reply
                                </span>
                              ) : null}
                              <p className="whitespace-pre-wrap text-sm leading-7 tracking-[-0.01em]">{message.text}</p>
                              </div>
                              <div className={cn("flex items-center gap-1.5 px-1 text-[11px]", isIncoming ? "justify-start text-slate-500" : "justify-end text-white/55")}>
                                <span className="text-[11px] text-white/55">{message.time}</span>
                                {!isIncoming ? <MessageStatus status={message.status} /> : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {typingConversationId === activeConversation.id ? (
                        <div className="flex justify-start pr-10">
                          <div className="max-w-[76%] rounded-[24px] rounded-bl-md border border-white/5 bg-[linear-gradient(180deg,#202c33,#1a262d)] px-4 py-3.5 text-slate-100 shadow-[0_14px_35px_rgba(0,0,0,0.16)]">
                            <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-100">
                              <Bot className="h-3 w-3" />
                              AI drafting
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-300" />
                              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-300 [animation-delay:150ms]" />
                              <span className="h-2 w-2 animate-pulse rounded-full bg-slate-300 [animation-delay:300ms]" />
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="border-t border-white/5 bg-[linear-gradient(180deg,#111b21,#0f191f)] px-4 py-3 sm:px-5">
                    <div className="mx-auto flex max-w-4xl flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="bg-[#202c33] text-slate-200 hover:bg-[#2a3942]"
                          onClick={handleSimulateLead}
                          disabled={twilioConfigured && serverConversations.length > 0}
                        >
                          {twilioConfigured && serverConversations.length > 0 ? "Webhook-driven inbox" : "Simulate Lead Message"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="bg-[#202c33] text-slate-200 hover:bg-[#2a3942]"
                          onClick={handleDraftWithAi}
                          disabled={isGeneratingDraft || !canUseAiDrafts}
                        >
                          {!canUseAiDrafts ? "Growth+ AI Drafts" : isGeneratingDraft ? "Drafting..." : "Draft with AI"}
                        </Button>
                        <span className={cn("rounded-full px-3 py-1 text-[11px] font-medium", activeMode === "manual" ? "bg-amber-500/15 text-amber-300" : "bg-emerald-500/15 text-emerald-300")}>
                          {activeMode === "manual" ? "Manual override active" : "AI autopilot active"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {activeMode === "manual"
                            ? "Your replies send directly and pause automated takeovers."
                            : "Messages send through the Express chat API and save directly to PostgreSQL."}
                        </span>
                        {!canUseAiDrafts ? <span className="text-xs text-amber-300">Upgrade to Growth to unlock AI draft assist.</span> : null}
                      </div>

                      <form
                        onSubmit={handleSubmit}
                        className="flex items-end gap-3 rounded-[26px] border border-white/5 bg-[linear-gradient(180deg,#202c33,#1c2a31)] p-2.5 shadow-[0_18px_44px_rgba(0,0,0,0.2)]"
                      >
                        <Input
                          value={input}
                          onChange={(event) => setInput(event.target.value)}
                          placeholder="Send a message and get an AI reply..."
                          className="min-h-12 flex-1 border-none bg-transparent px-3 text-slate-100 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        <Button
                          type="submit"
                          size="icon"
                          disabled={isSending}
                          className="h-12 w-12 rounded-2xl bg-[#25d366] text-[#0d1f19] hover:bg-[#25d366]/90"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center bg-[#0b141a] px-6 text-center text-sm text-slate-400">
                  Select a conversation to view the full chat history.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
