import { AppLayout } from "@/components/AppLayout";
import { useBilling } from "@/context/BillingContext";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, BellOff, Bot, CalendarCheck, Clock3, Download, Filter, MessageSquareText, Plus, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface LeadsApiItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  status: string;
  source: string;
  captureOrigin?: string | null;
  captureReferer?: string | null;
  notes?: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
  conversation?: {
    id: string;
    channel: string;
    status: string;
    mode: "ai" | "manual";
    messageCount: number;
    lastMessageAt: string | null;
    nextFollowUpAt: string | null;
    followUpCount: number;
    lastFollowUpAt: string | null;
    lastLeadReplyAt: string | null;
    lastAiReplyAt: string | null;
    readiness: string;
    preferredDemoTime: string;
    demoReady: boolean;
    contactCollected: boolean;
  } | null;
}

interface LeadsApiResponse {
  data?: {
    items?: LeadsApiItem[];
    lead?: LeadsApiItem;
  };
  message?: string;
}

type LeadSourceGroup = "WhatsApp" | "Website" | "Manual" | "Ads";
type BackendLeadStatus = "new" | "qualified" | "follow_up" | "converted";

const statusColor: Record<string, string> = {
  New: "bg-info/15 text-info border-info/20",
  Qualified: "bg-warning/15 text-warning border-warning/20",
  "Follow-up": "bg-primary/15 text-primary border-primary/20",
  Converted: "bg-success/15 text-success border-success/20",
};

const sourceColor: Record<LeadSourceGroup, string> = {
  WhatsApp: "bg-emerald-500/12 text-emerald-300 border-emerald-500/20",
  Website: "bg-sky-500/12 text-sky-300 border-sky-500/20",
  Manual: "bg-amber-500/12 text-amber-300 border-amber-500/20",
  Ads: "bg-fuchsia-500/12 text-fuchsia-300 border-fuchsia-500/20",
};

const sourceOptions = ["all", "WhatsApp", "Website", "Manual", "Ads"] as const;
const statusOptions = ["all", "New", "Qualified", "Follow-up", "Converted"] as const;
const modeOptions = ["all", "ai", "manual"] as const;
const segmentOptions = ["all", "recent", "demo_ready", "converted"] as const;
const sortOptions = ["recently_active", "newest", "oldest", "most_messages"] as const;
const groupedSourceOrder: LeadSourceGroup[] = ["WhatsApp", "Website", "Manual", "Ads"];
const LEAD_REFRESH_INTERVAL_MS = 15000;
const LEAD_HIGHLIGHT_DURATION_MS = 6000;
const leadStatusOptions: Array<{ value: BackendLeadStatus; label: "New" | "Qualified" | "Follow-up" | "Converted" }> = [
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "follow_up", label: "Follow-up" },
  { value: "converted", label: "Converted" },
];

function formatLastContact(value: string | null | undefined) {
  if (!value) {
    return "No contact yet";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getActivityTime(lead: LeadsApiItem) {
  return lead.conversation?.lastMessageAt || lead.lastContactAt || lead.updatedAt || lead.createdAt;
}

function getTimeValue(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function isRecentLead(lead: LeadsApiItem) {
  const createdAt = getTimeValue(lead.createdAt);
  return createdAt > 0 && Date.now() - createdAt <= 7 * 24 * 60 * 60 * 1000;
}

function normalizeLeadStatus(status: string) {
  const value = status.trim().toLowerCase();

  if (value === "qualified") {
    return "Qualified";
  }

  if (value === "follow_up" || value === "follow-up" || value === "followup") {
    return "Follow-up";
  }

  if (value === "converted") {
    return "Converted";
  }

  return "New";
}

function formatLeadCreatedAt(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function mergeLeadIntoList(leads: LeadsApiItem[], updatedLead: LeadsApiItem) {
  return leads.map((lead) => (lead.id === updatedLead.id ? updatedLead : lead));
}

function formatCaptureValue(value: string | null | undefined) {
  const normalizedValue = value?.trim() || "";

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue;
}

function formatCaptureOriginSummary(value: string | null | undefined) {
  const normalizedValue = formatCaptureValue(value);

  if (!normalizedValue) {
    return null;
  }

  try {
    return new URL(normalizedValue).host;
  } catch {
    return normalizedValue;
  }
}

function normalizeLeadSource(source: string): LeadSourceGroup {
  const value = source.trim().toLowerCase();

  if (value === "whatsapp") {
    return "WhatsApp";
  }

  if (value === "website") {
    return "Website";
  }

  if (value === "manual") {
    return "Manual";
  }

  if (value === "whatsapp_ad" || value === "whatsapp ad" || value === "referral" || value === "ads" || value === "ad") {
    return "Ads";
  }

  return "Ads";
}

function escapeCsvValue(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildLeadTimeline(lead: LeadsApiItem) {
  const items = [
    {
      id: "created",
      icon: UserRound,
      title: "Lead created",
      detail: `${normalizeLeadSource(lead.source)} lead entered the CRM.`,
      time: lead.createdAt,
    },
  ];

  if (lead.conversation) {
    items.push({
      id: "conversation",
      icon: MessageSquareText,
      title: "Conversation activity",
      detail: `${lead.conversation.messageCount} messages • ${lead.conversation.mode === "ai" ? "AI handled" : "Manual handled"}`,
      time: lead.conversation.lastMessageAt || lead.updatedAt,
    });

    if (lead.conversation.lastAiReplyAt) {
      items.push({
        id: "ai-reply",
        icon: Bot,
        title: "AI replied",
        detail: "Latest AI response recorded for this lead.",
        time: lead.conversation.lastAiReplyAt,
      });
    }

    if (lead.conversation.demoReady) {
      items.push({
        id: "demo-ready",
        icon: CalendarCheck,
        title: lead.conversation.contactCollected ? "Contact details collected" : "Demo intent detected",
        detail: lead.conversation.preferredDemoTime || "Lead is in a demo/contact-ready state.",
        time: lead.conversation.lastMessageAt || lead.updatedAt,
      });
    }

    if (lead.conversation.nextFollowUpAt || lead.conversation.lastFollowUpAt) {
      items.push({
        id: "follow-up",
        icon: Clock3,
        title: lead.conversation.nextFollowUpAt ? "Follow-up scheduled" : "Follow-up sent",
        detail: `${lead.conversation.followUpCount}/3 follow-ups used.`,
        time: lead.conversation.nextFollowUpAt || lead.conversation.lastFollowUpAt,
      });
    }
  }

  if (normalizeLeadStatus(lead.status) === "Converted") {
    items.push({
      id: "converted",
      icon: CalendarCheck,
      title: "Lead converted",
      detail: "Marked as converted in the CRM.",
      time: lead.updatedAt,
    });
  }

  return items.sort((a, b) => getTimeValue(b.time) - getTimeValue(a.time));
}

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recently_active");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [leads, setLeads] = useState<LeadsApiItem[]>([]);
  const [highlightedLeadIds, setHighlightedLeadIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadsApiItem | null>(null);
  const [isLeadDetailLoading, setIsLeadDetailLoading] = useState(false);
  const [leadDetailError, setLeadDetailError] = useState<string | null>(null);
  const [isUpdatingLead, setIsUpdatingLead] = useState(false);
  const [leadNotesDraft, setLeadNotesDraft] = useState("");
  const [isSavingLeadNotes, setIsSavingLeadNotes] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { canAddLead, currentPlan } = useBilling();
  const hasLeadCapacity = canAddLead(leads.length);
  const knownLeadIdsRef = useRef<Set<string>>(new Set());
  const soundEnabledRef = useRef(soundEnabled);

  const playLeadNotificationSound = () => {
    if (!soundEnabled || typeof window === "undefined" || typeof window.AudioContext === "undefined") {
      return;
    }

    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    gainNode.gain.setValueAtTime(0.001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.24);
    oscillator.onended = () => {
      void context.close();
    };
  };

  const highlightLeads = (leadIds: string[]) => {
    if (leadIds.length === 0 || typeof window === "undefined") {
      return;
    }

    setHighlightedLeadIds((current) => Array.from(new Set([...leadIds, ...current])));

    window.setTimeout(() => {
      setHighlightedLeadIds((current) => current.filter((id) => !leadIds.includes(id)));
    }, LEAD_HIGHLIGHT_DURATION_MS);
  };

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase());
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    const loadLeads = async (options?: { notify?: boolean; background?: boolean }) => {
      if (!options?.background) {
        setIsLoading(true);
      }

      try {
        const response = await apiFetch("/api/leads");
        const payload = await parseApiJson<LeadsApiResponse>(response);

        if (!response.ok) {
          throw new Error(payload.message || "Unable to fetch leads.");
        }

        if (!cancelled) {
          const nextLeads = payload.data?.items ?? [];
          const nextIds = new Set(nextLeads.map((lead) => lead.id));

          if (options?.notify) {
            const newLeadIds = nextLeads.filter((lead) => !knownLeadIdsRef.current.has(lead.id)).map((lead) => lead.id);

            if (newLeadIds.length > 0) {
              toast.success("New Lead Received");
              setHighlightedLeadIds((current) => Array.from(new Set([...newLeadIds, ...current])));
              window.setTimeout(() => {
                setHighlightedLeadIds((current) => current.filter((id) => !newLeadIds.includes(id)));
              }, LEAD_HIGHLIGHT_DURATION_MS);

              if (soundEnabledRef.current && typeof window.AudioContext !== "undefined") {
                const context = new window.AudioContext();
                const oscillator = context.createOscillator();
                const gainNode = context.createGain();

                oscillator.type = "sine";
                oscillator.frequency.setValueAtTime(880, context.currentTime);
                gainNode.gain.setValueAtTime(0.001, context.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.02);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);

                oscillator.connect(gainNode);
                gainNode.connect(context.destination);
                oscillator.start();
                oscillator.stop(context.currentTime + 0.24);
                oscillator.onended = () => {
                  void context.close();
                };
              }
            }
          }

          knownLeadIdsRef.current = nextIds;
          setLeads(nextLeads);
          setApiError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setApiError(error instanceof Error ? error.message : "Unable to fetch leads.");
        }
      } finally {
        if (!cancelled) {
          if (!options?.background) {
            setIsLoading(false);
          }
        }
      }
    };

    void loadLeads();
    const intervalId = window.setInterval(() => {
      void loadLeads({ notify: true, background: true });
    }, LEAD_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadLeadDetail = async () => {
      if (!isLeadDetailOpen || !selectedLeadId) {
        return;
      }

      setIsLeadDetailLoading(true);
      setLeadDetailError(null);

      try {
        const response = await apiFetch(`/api/leads/${selectedLeadId}`);
        const payload = await parseApiJson<LeadsApiResponse>(response);

        if (!response.ok || !payload.data?.lead) {
          throw new Error(payload.message || "Unable to fetch lead details.");
        }

        if (!cancelled) {
          setSelectedLead(payload.data.lead);
          setLeads((current) => mergeLeadIntoList(current, payload.data!.lead!));
        }
      } catch (error) {
        if (!cancelled) {
          setLeadDetailError(error instanceof Error ? error.message : "Unable to fetch lead details.");
        }
      } finally {
        if (!cancelled) {
          setIsLeadDetailLoading(false);
        }
      }
    };

    void loadLeadDetail();

    return () => {
      cancelled = true;
    };
  }, [isLeadDetailOpen, selectedLeadId]);

  useEffect(() => {
    setLeadNotesDraft(selectedLead?.notes ?? "");
  }, [selectedLead]);

  const filteredLeads = useMemo(() => {
    const nextLeads = leads.filter((lead) => {
        const normalizedStatus = normalizeLeadStatus(lead.status);
        const normalizedSource = normalizeLeadSource(lead.source);
        const mode = lead.conversation?.mode || "manual";
        const searchMatch =
          !debouncedSearch ||
          lead.name.toLowerCase().includes(debouncedSearch) ||
          (lead.email || "").toLowerCase().includes(debouncedSearch) ||
          lead.phone.toLowerCase().includes(debouncedSearch) ||
          normalizedSource.toLowerCase().includes(debouncedSearch) ||
          (lead.captureOrigin || "").toLowerCase().includes(debouncedSearch) ||
          (lead.captureReferer || "").toLowerCase().includes(debouncedSearch) ||
          (lead.notes || "").toLowerCase().includes(debouncedSearch);
        const statusMatch = statusFilter === "all" || normalizedStatus === statusFilter;
        const sourceMatch = sourceFilter === "all" || normalizedSource === sourceFilter;
        const modeMatch = modeFilter === "all" || mode === modeFilter;
        const segmentMatch =
          segmentFilter === "all" ||
          (segmentFilter === "recent" && isRecentLead(lead)) ||
          (segmentFilter === "demo_ready" && Boolean(lead.conversation?.demoReady)) ||
          (segmentFilter === "converted" && normalizedStatus === "Converted");

        return searchMatch && statusMatch && sourceMatch && modeMatch && segmentMatch;
      });

    return [...nextLeads].sort((a, b) => {
      if (sortBy === "newest") {
        return getTimeValue(b.createdAt) - getTimeValue(a.createdAt);
      }

      if (sortBy === "oldest") {
        return getTimeValue(a.createdAt) - getTimeValue(b.createdAt);
      }

      if (sortBy === "most_messages") {
        return (b.conversation?.messageCount || 0) - (a.conversation?.messageCount || 0);
      }

      return getTimeValue(getActivityTime(b)) - getTimeValue(getActivityTime(a));
    });
  }, [debouncedSearch, leads, modeFilter, segmentFilter, sortBy, sourceFilter, statusFilter]);

  const groupedLeads = useMemo(
    () =>
      groupedSourceOrder.map((source) => ({
        source,
        items: filteredLeads.filter((lead) => normalizeLeadSource(lead.source) === source),
      })),
    [filteredLeads],
  );

  const sourceCounts = useMemo(
    () =>
      groupedSourceOrder.map((source) => ({
        source,
        count: leads.filter((lead) => normalizeLeadSource(lead.source) === source).length,
      })),
    [leads],
  );
  const crmCounts = useMemo(
    () => ({
      total: leads.length,
      recent: leads.filter(isRecentLead).length,
      demoReady: leads.filter((lead) => lead.conversation?.demoReady).length,
      aiHandled: leads.filter((lead) => lead.conversation?.mode === "ai").length,
      converted: leads.filter((lead) => normalizeLeadStatus(lead.status) === "Converted").length,
    }),
    [leads],
  );

  const exportVisibleLeads = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Status",
      "Source",
      "Conversation Mode",
      "Conversation Status",
      "Message Count",
      "Demo Ready",
      "Last Activity",
      "Notes",
    ];
    const rows = filteredLeads.map((lead) => [
      lead.name,
      lead.email || "",
      lead.phone,
      normalizeLeadStatus(lead.status),
      normalizeLeadSource(lead.source),
      lead.conversation?.mode || "",
      lead.conversation?.status || "",
      lead.conversation?.messageCount || 0,
      lead.conversation?.demoReady ? "yes" : "no",
      getActivityTime(lead) || "",
      lead.notes || "",
    ]);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `jafleadx-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLeads.length} visible leads.`);
  };

  const openLeadDetail = (lead: LeadsApiItem) => {
    setSelectedLeadId(lead.id);
    setSelectedLead(lead);
    setLeadDetailError(null);
    setIsLeadDetailOpen(true);
  };

  const handleLeadStatusChange = async (nextStatus: BackendLeadStatus) => {
    if (!selectedLeadId || !selectedLead) {
      return;
    }

    if (selectedLead.status === nextStatus) {
      return;
    }

    setIsUpdatingLead(true);

    try {
      const response = await apiFetch(`/api/leads/${selectedLeadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });
      const payload = await parseApiJson<LeadsApiResponse>(response);

      if (!response.ok || !payload.data?.lead) {
        throw new Error(payload.message || "Unable to update lead status.");
      }

      setSelectedLead(payload.data.lead);
      setLeads((current) => mergeLeadIntoList(current, payload.data!.lead!));
      toast.success("Lead status updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update lead status.");
    } finally {
      setIsUpdatingLead(false);
    }
  };

  const handleSaveLeadNotes = async () => {
    if (!selectedLeadId || !selectedLead) {
      return;
    }

    const normalizedNotes = leadNotesDraft.trim();
    const nextNotes = normalizedNotes || null;
    const currentNotes = selectedLead.notes?.trim() || null;

    if (currentNotes === nextNotes) {
      toast.success("Notes are already up to date.");
      return;
    }

    setIsSavingLeadNotes(true);

    try {
      const response = await apiFetch(`/api/leads/${selectedLeadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notes: nextNotes,
        }),
      });
      const payload = await parseApiJson<LeadsApiResponse>(response);

      if (!response.ok || !payload.data?.lead) {
        throw new Error(payload.message || "Unable to update lead notes.");
      }

      setSelectedLead(payload.data.lead);
      setLeads((current) => mergeLeadIntoList(current, payload.data!.lead!));
      toast.success("Lead notes updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update lead notes.");
    } finally {
      setIsSavingLeadNotes(false);
    }
  };

  const handleCreateLead = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone are required.");
      return;
    }

    if (!hasLeadCapacity) {
      toast.error(`Your ${currentPlan.name} plan has reached its lead limit.`);
      return;
    }

    setIsSaving(true);

    try {
      const response = await apiFetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          source: "manual",
          status: "new",
          notes: notes.trim() || null,
        }),
      });
      const payload = await parseApiJson<LeadsApiResponse>(response);

      if (!response.ok || !payload.data?.lead) {
        throw new Error(payload.message || "Unable to add lead.");
      }

      const newLead = payload.data.lead;
      knownLeadIdsRef.current = new Set([newLead.id, ...knownLeadIdsRef.current]);
      setLeads((current) => [newLead, ...current]);
      setApiError(null);
      toast.success("New Lead Received");
      highlightLeads([newLead.id]);
      playLeadNotificationSound();
      setName("");
      setPhone("");
      setNotes("");
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to add lead.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-foreground">Leads</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Search, filter, and manage your lead pipeline from one responsive workspace.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!hasLeadCapacity} className="h-11 rounded-2xl px-5">
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>
                  Add a lead manually with their contact details and any notes for follow-up.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="manual-lead-name">Name</Label>
                  <Input id="manual-lead-name" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-lead-phone">Phone</Label>
                  <Input id="manual-lead-phone" placeholder="+1 555-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manual-lead-notes">Notes</Label>
                  <Textarea
                    id="manual-lead-notes"
                    placeholder="Add context, requirements, or follow-up details"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[112px]"
                  />
                </div>
                <Button className="w-full" onClick={handleCreateLead} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Lead"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {!hasLeadCapacity ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            You have reached the {currentPlan.name} lead limit. Upgrade your plan to add more leads this month.
          </div>
        ) : null}

        <section
          className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-4 shadow-[0_18px_50px_hsl(222_47%_3%/0.35)] sm:p-5"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone, source, origin, or notes"
                className="h-11 rounded-2xl pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:items-center">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-secondary/35 px-3 py-2 text-xs font-medium text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                Filters
              </div>
              <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => setSoundEnabled((current) => !current)}>
                {soundEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                {soundEnabled ? "Sound on" : "Sound off"}
              </Button>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-11 min-w-[170px] rounded-2xl">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "all" ? "All statuses" : item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="h-11 min-w-[170px] rounded-2xl">
                  <SelectValue placeholder="Filter by source" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "all" ? "All sources" : item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={modeFilter} onValueChange={setModeFilter}>
                <SelectTrigger className="h-11 min-w-[150px] rounded-2xl">
                  <SelectValue placeholder="AI/manual" />
                </SelectTrigger>
                <SelectContent>
                  {modeOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "all" ? "All modes" : item === "ai" ? "AI handled" : "Manual handled"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                <SelectTrigger className="h-11 min-w-[170px] rounded-2xl">
                  <SelectValue placeholder="Segment" />
                </SelectTrigger>
                <SelectContent>
                  {segmentOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "all"
                        ? "All leads"
                        : item === "recent"
                          ? "New in 7 days"
                          : item === "demo_ready"
                            ? "Demo/contact ready"
                            : "Converted"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-11 min-w-[170px] rounded-2xl">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item === "recently_active"
                        ? "Recently active"
                        : item === "newest"
                          ? "Newest first"
                          : item === "oldest"
                            ? "Oldest first"
                            : "Most messages"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={exportVisibleLeads} disabled={filteredLeads.length === 0}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Visible Leads", value: filteredLeads.length, helper: `${crmCounts.total} total in CRM` },
            { label: "New 7 Days", value: crmCounts.recent, helper: "Recently created" },
            { label: "Demo Ready", value: crmCounts.demoReady, helper: "Detected demo/contact intent" },
            { label: "AI Handled", value: crmCounts.aiHandled, helper: "Conversation mode is AI" },
            { label: "Converted", value: crmCounts.converted, helper: "Marked won" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-5 shadow-[0_18px_50px_hsl(222_47%_3%/0.28)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
              <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-foreground">{item.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.helper}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {sourceCounts.map((item) => (
            <div
              key={item.source}
              className="rounded-[24px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-5 shadow-[0_18px_50px_hsl(222_47%_3%/0.28)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{item.source}</p>
              <p className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em] text-foreground">{item.count}</p>
              <p className="mt-1 text-sm text-muted-foreground">Leads from this source</p>
            </div>
          ))}
        </section>

        <section
          className="overflow-hidden rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] shadow-[0_18px_50px_hsl(222_47%_3%/0.35)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="border-b border-border/70 px-5 py-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Lead table</h2>
                <p className="text-sm text-muted-foreground">{filteredLeads.length} leads from the database matching your current search and filters.</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading leads..." : apiError ? "API unavailable" : "Synced from /api/leads"}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-secondary/25">
                <tr className="border-b border-border/70">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Name</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Phone</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Source</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notes</th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Last Contact</th>
                </tr>
              </thead>
              {apiError ? (
                <tbody>
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      {apiError}
                    </td>
                  </tr>
                </tbody>
              ) : null}
              {isLoading && !apiError ? (
                <tbody>
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      Loading leads from the API...
                    </td>
                  </tr>
                </tbody>
              ) : null}
              {!isLoading && !apiError && filteredLeads.length > 0
                ? groupedLeads.map((group) => (
                    <tbody key={group.source}>
                      <tr className="border-y border-border/60 bg-secondary/15">
                        <td colSpan={6} className="px-5 py-3 text-left">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              {group.source}
                            </span>
                            <span className="text-xs text-muted-foreground">{group.items.length} leads</span>
                          </div>
                        </td>
                      </tr>
                      {group.items.length > 0
                        ? group.items.map((lead) => (
                            <tr
                              key={lead.id}
                              className={cn(
                                "border-b border-border/50 transition-colors hover:bg-secondary/20",
                                highlightedLeadIds.includes(lead.id) && "bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.3)]",
                              )}
                            >
                              <td className="px-5 py-4">
                                <div className="min-w-[180px]">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="font-medium text-foreground transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                                      onClick={() => openLeadDetail(lead)}
                                    >
                                      {lead.name}
                                    </button>
                                    {highlightedLeadIds.includes(lead.id) ? (
                                      <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                                        New
                                      </span>
                                    ) : null}
                                  </div>
                                  {lead.email ? (
                                    <p className="mt-1 truncate text-xs text-muted-foreground">{lead.email}</p>
                                  ) : null}
                                  {lead.conversation ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      <span className="inline-flex rounded-full border border-border/70 bg-secondary/35 px-2 py-0.5 text-[11px] text-muted-foreground">
                                        {lead.conversation.status.replace(/_/g, " ")}
                                      </span>
                                      {lead.conversation.demoReady ? (
                                        <span className="inline-flex rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[11px] text-success">
                                          Demo ready
                                        </span>
                                      ) : null}
                                    </div>
                                  ) : null}
                                  <p className="mt-1 text-xs text-muted-foreground sm:hidden">{lead.phone}</p>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-muted-foreground">
                                <span className="hidden sm:inline">{lead.phone}</span>
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={cn(
                                    "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                                    statusColor[normalizeLeadStatus(lead.status)],
                                  )}
                                >
                                  {normalizeLeadStatus(lead.status)}
                                </span>
                                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                                  {lead.conversation?.mode === "ai" ? <Bot className="h-3.5 w-3.5 text-primary" /> : <UserRound className="h-3.5 w-3.5" />}
                                  {lead.conversation?.mode === "ai" ? "AI handled" : "Manual"}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-muted-foreground">
                                <div className="min-w-[150px]">
                                  <span
                                    className={cn(
                                      "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                                      sourceColor[normalizeLeadSource(lead.source)],
                                    )}
                                  >
                                    {normalizeLeadSource(lead.source)}
                                  </span>
                                  {formatCaptureOriginSummary(lead.captureOrigin) ? (
                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                      {formatCaptureOriginSummary(lead.captureOrigin)}
                                    </p>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-muted-foreground">
                                <div className="max-w-[280px] whitespace-pre-wrap break-words text-sm leading-6">
                                  {lead.notes?.trim() || "No notes"}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {lead.conversation ? `${lead.conversation.messageCount} messages` : "No conversation yet"}
                                </p>
                              </td>
                              <td className="px-5 py-4 text-muted-foreground">{formatLastContact(getActivityTime(lead))}</td>
                            </tr>
                          ))
                        : (
                          <tr>
                            <td colSpan={6} className="px-5 py-5 text-sm text-muted-foreground">
                              No {group.source.toLowerCase()} leads in the current result set.
                            </td>
                          </tr>
                        )}
                    </tbody>
                  ))
                : null}
              {filteredLeads.length === 0 && !isLoading && !apiError ? (
                <tbody>
                  <tr>
                    <td colSpan={6} className="px-5 py-12">
                      <div className="mx-auto max-w-xl rounded-[24px] border border-dashed border-border/80 bg-secondary/20 p-6 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Search className="h-5 w-5" />
                        </div>
                        <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
                          {leads.length === 0 ? "Your CRM will fill as leads arrive" : "No leads match these filters"}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {leads.length === 0
                            ? "Website capture, WhatsApp, and manual entry all feed this pipeline with real lead activity."
                            : "Try clearing search, changing the segment, or exporting a broader filtered view."}
                        </p>
                        {leads.length === 0 ? (
                          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                            <Button asChild>
                              <Link to="/settings#website-capture">Set up website capture</Link>
                            </Button>
                            <Button variant="outline" asChild>
                              <Link to="/settings#whatsapp">Connect WhatsApp</Link>
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : null}
            </table>
          </div>
        </section>

        <Dialog
          open={isLeadDetailOpen}
          onOpenChange={(open) => {
            setIsLeadDetailOpen(open);

            if (!open) {
              setLeadDetailError(null);
              setSelectedLeadId(null);
              setSelectedLead(null);
              setLeadNotesDraft("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedLead?.name || "Lead details"}</DialogTitle>
              <DialogDescription>
                Review lead information and update the lead status for follow-up.
              </DialogDescription>
            </DialogHeader>

            {isLeadDetailLoading ? (
              <div className="py-6 text-sm text-muted-foreground">Loading lead details...</div>
            ) : leadDetailError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {leadDetailError}
              </div>
            ) : selectedLead ? (
              <div className="space-y-5 pt-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Name</p>
                    <p className="text-sm text-foreground">{selectedLead.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground">{selectedLead.email?.trim() || "No email"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Phone</p>
                    <p className="text-sm text-foreground">{selectedLead.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Created</p>
                    <p className="text-sm text-foreground">{formatLeadCreatedAt(selectedLead.createdAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Source</p>
                    <div className="space-y-1">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                          sourceColor[normalizeLeadSource(selectedLead.source)],
                        )}
                      >
                        {normalizeLeadSource(selectedLead.source)}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Status</p>
                    <Select value={selectedLead.status} onValueChange={(value) => void handleLeadStatusChange(value as BackendLeadStatus)}>
                      <SelectTrigger className="h-11 rounded-2xl" disabled={isUpdatingLead}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {leadStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {isUpdatingLead ? "Saving status..." : `Current status: ${normalizeLeadStatus(selectedLead.status)}`}
                    </p>
                  </div>
                </div>

                {formatCaptureValue(selectedLead.captureOrigin) || formatCaptureValue(selectedLead.captureReferer) ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {formatCaptureValue(selectedLead.captureOrigin) ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Capture Origin</p>
                        <p className="break-all text-sm text-foreground">{formatCaptureValue(selectedLead.captureOrigin)}</p>
                      </div>
                    ) : null}
                    {formatCaptureValue(selectedLead.captureReferer) ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Capture Referer</p>
                        <p className="break-all text-sm text-foreground">{formatCaptureValue(selectedLead.captureReferer)}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Notes</p>
                  <Textarea
                    value={leadNotesDraft}
                    onChange={(event) => setLeadNotesDraft(event.target.value)}
                    className="min-h-[112px]"
                    placeholder="Add context, follow-up details, or qualification notes"
                    disabled={isSavingLeadNotes}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      {isSavingLeadNotes
                        ? "Saving notes..."
                        : (selectedLead.notes?.trim() || null) === (leadNotesDraft.trim() || null)
                          ? "Notes are in sync."
                          : "Unsaved notes changes."}
                    </p>
                    <Button type="button" onClick={handleSaveLeadNotes} disabled={isSavingLeadNotes}>
                      {isSavingLeadNotes ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Activity Timeline</p>
                  <div className="space-y-3 rounded-[22px] border border-border/70 bg-secondary/15 p-4">
                    {buildLeadTimeline(selectedLead).map((item) => {
                      const Icon = item.icon;

                      return (
                        <div key={item.id} className="flex gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                              <p className="text-sm font-medium text-foreground">{item.title}</p>
                              <p className="text-xs text-muted-foreground">{formatLastContact(item.time)}</p>
                            </div>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-sm text-muted-foreground">Select a lead to view its details.</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
