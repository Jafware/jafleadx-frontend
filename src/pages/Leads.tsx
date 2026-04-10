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
import { Bell, BellOff, Filter, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

interface LeadsApiItem {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  status: string;
  source: string;
  notes?: string | null;
  lastContactAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LeadsApiResponse {
  data?: {
    items?: LeadsApiItem[];
    lead?: LeadsApiItem;
  };
  message?: string;
}

type LeadSourceGroup = "WhatsApp" | "Website" | "Manual" | "Ads";

const statusColor: Record<string, string> = {
  New: "bg-info/15 text-info border-info/20",
  Qualified: "bg-warning/15 text-warning border-warning/20",
  "Follow-up": "bg-primary/15 text-primary border-primary/20",
  Converted: "bg-success/15 text-success border-success/20",
};

const sourceOptions = ["all", "WhatsApp", "Website", "Manual", "Ads"] as const;
const statusOptions = ["all", "New", "Qualified", "Follow-up", "Converted"] as const;
const groupedSourceOrder: LeadSourceGroup[] = ["WhatsApp", "Website", "Manual", "Ads"];
const LEAD_REFRESH_INTERVAL_MS = 15000;
const LEAD_HIGHLIGHT_DURATION_MS = 6000;

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

function normalizeLeadStatus(status: string) {
  const value = status.trim().toLowerCase();

  if (value === "qualified") {
    return "Qualified";
  }

  if (value === "follow-up" || value === "followup") {
    return "Follow-up";
  }

  if (value === "converted") {
    return "Converted";
  }

  return "New";
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

export default function Leads() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [leads, setLeads] = useState<LeadsApiItem[]>([]);
  const [highlightedLeadIds, setHighlightedLeadIds] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
    let cancelled = false;

    const loadLeads = async (options?: { notify?: boolean; background?: boolean }) => {
      if (!options?.background) {
        setIsLoading(true);
      }

      try {
        const response = await apiFetch("${import.meta.env.VITE_API_BASE_URL}/api/leads");
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

  const filteredLeads = useMemo(
    () =>
      leads.filter((lead) => {
        const normalizedStatus = normalizeLeadStatus(lead.status);
        const normalizedSource = normalizeLeadSource(lead.source);
        const searchMatch =
          lead.name.toLowerCase().includes(search.toLowerCase()) ||
          lead.phone.toLowerCase().includes(search.toLowerCase()) ||
          normalizedSource.toLowerCase().includes(search.toLowerCase()) ||
          (lead.notes || "").toLowerCase().includes(search.toLowerCase());
        const statusMatch = statusFilter === "all" || normalizedStatus === statusFilter;
        const sourceMatch = sourceFilter === "all" || normalizedSource === sourceFilter;

        return searchMatch && statusMatch && sourceMatch;
      }),
    [leads, search, sourceFilter, statusFilter],
  );

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
      const response = await apiFetch("${import.meta.env.VITE_API_BASE_URL}/api/leads", {
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
                placeholder="Search by name, phone, or source"
                className="h-11 rounded-2xl pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:items-center">
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
            </div>
          </div>
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
                                    <p className="font-medium text-foreground">{lead.name}</p>
                                    {highlightedLeadIds.includes(lead.id) ? (
                                      <span className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                                        New
                                      </span>
                                    ) : null}
                                  </div>
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
                              </td>
                              <td className="px-5 py-4 text-muted-foreground">{normalizeLeadSource(lead.source)}</td>
                              <td className="px-5 py-4 text-muted-foreground">
                                <div className="max-w-[280px] whitespace-pre-wrap break-words text-sm leading-6">
                                  {lead.notes?.trim() || "No notes"}
                                </div>
                              </td>
                              <td className="px-5 py-4 text-muted-foreground">{formatLastContact(lead.lastContactAt)}</td>
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
                    <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground">
                      No leads match your current search or filters.
                    </td>
                  </tr>
                </tbody>
              ) : null}
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
