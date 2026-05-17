import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bot, CalendarClock, Globe2, KeyRound, MessageSquareText, Search, ShieldCheck, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type BillingStatusSummary = {
  plan: string;
  status: string;
  count: number;
};

type AdminSummary = {
  totalUsers: number;
  activeUsers: number;
  totalLeads: number;
  totalConversations: number;
  websiteCaptureEnabledCount: number;
  whatsappConfiguredCount: number;
  billingMode: string;
  billingStatusSummary: BillingStatusSummary[];
};

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
  lastLoginAt: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  leadCount: number;
  conversationCount: number;
  websiteCaptureEnabled: boolean;
  publicCaptureEnabled: boolean;
  websiteUrl: string;
  whatsappNumber: string;
  allowedOriginsCount: number;
  hasPublicCaptureSiteKey: boolean;
};

type AdminRecentLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  source: string;
  status: string;
  createdAt: string;
  lastContactAt: string | null;
};

type AdminRecentConversation = {
  id: string;
  leadId: string;
  channel: string;
  status: string;
  mode: string;
  lastMessageAt: string | null;
  messageCount: number;
};

type AdminUserDetail = {
  account: AdminUser;
  settings: {
    businessType: string;
    tone: string;
    websiteUrl: string;
    websiteKnowledgeUpdatedAt: string | null;
    websiteKnowledgeError: string;
    whatsappNumber: string;
    publicCaptureEnabled: boolean;
    allowedOrigins: string[];
    allowedOriginsCount: number;
    hasPublicCaptureSiteKey: boolean;
    maskedPublicCaptureSiteKey: string;
    automationEnabled: boolean;
  };
  counts: {
    leads: number;
    conversations: number;
  };
  recentLeads: AdminRecentLead[];
  recentConversations: AdminRecentConversation[];
};

interface SummaryResponse {
  data?: {
    summary?: AdminSummary;
  };
  message?: string;
}

interface UsersResponse {
  data?: {
    users?: AdminUser[];
  };
  message?: string;
}

interface UserDetailResponse {
  data?: {
    user?: AdminUserDetail;
  };
  message?: string;
}

const emptySummary: AdminSummary = {
  totalUsers: 0,
  activeUsers: 0,
  totalLeads: 0,
  totalConversations: 0,
  websiteCaptureEnabledCount: 0,
  whatsappConfiguredCount: 0,
  billingMode: "disabled",
  billingStatusSummary: [],
};

function formatDate(value: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

function statusTone(status: string) {
  if (status === "active") {
    return "border-success/20 bg-success/10 text-success";
  }

  if (status === "pending") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-200";
  }

  return "border-border/70 bg-secondary/40 text-muted-foreground";
}

function SmallBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-5 shadow-[0_18px_50px_hsl(222_47%_3%/0.24)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
      </div>
      <p className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em] text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
    </div>
  );
}

export default function AdminPage() {
  const [summary, setSummary] = useState<AdminSummary>(emptySummary);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      setIsLoading(true);
      setError("");

      try {
        const [summaryResponse, usersResponse] = await Promise.all([
          apiFetch("/api/admin/summary"),
          apiFetch("/api/admin/users"),
        ]);
        const [summaryPayload, usersPayload] = await Promise.all([
          parseApiJson<SummaryResponse>(summaryResponse),
          parseApiJson<UsersResponse>(usersResponse),
        ]);

        if (!summaryResponse.ok) {
          throw new Error(summaryPayload.message || "Unable to load admin summary.");
        }

        if (!usersResponse.ok) {
          throw new Error(usersPayload.message || "Unable to load admin users.");
        }

        if (!cancelled) {
          setSummary(summaryPayload.data?.summary || emptySummary);
          setUsers(usersPayload.data?.users || []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load admin panel.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAdminData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!selectedUserId) {
        setSelectedUser(null);
        return;
      }

      setIsDetailLoading(true);

      try {
        const response = await apiFetch(`/api/admin/users/${selectedUserId}`);
        const payload = await parseApiJson<UserDetailResponse>(response);

        if (!response.ok || !payload.data?.user) {
          throw new Error(payload.message || "Unable to load user detail.");
        }

        if (!cancelled) {
          setSelectedUser(payload.data.user);
        }
      } catch (detailError) {
        if (!cancelled) {
          setSelectedUser(null);
          setError(detailError instanceof Error ? detailError.message : "Unable to load user detail.");
        }
      } finally {
        if (!cancelled) {
          setIsDetailLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedUserId]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter((user) =>
      [user.fullName, user.email, user.websiteUrl, user.whatsappNumber, user.subscriptionPlan, user.subscriptionStatus]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [search, users]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              Owner-only
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-foreground">Admin Support</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              Read-only account health, routing, and setup diagnostics for customer support. No secrets, deletion, editing, or impersonation.
            </p>
          </div>
          <SmallBadge className="border-border/70 bg-secondary/40 text-muted-foreground">Billing mode: {summary.billingMode}</SmallBadge>
        </div>

        {error ? (
          <div className="rounded-[24px] border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatTile icon={<Users className="h-5 w-5" />} label="Users" value={summary.totalUsers} helper={`${summary.activeUsers} active in 30d`} />
          <StatTile icon={<Bot className="h-5 w-5" />} label="Leads" value={summary.totalLeads} helper="All tenants" />
          <StatTile icon={<MessageSquareText className="h-5 w-5" />} label="Conversations" value={summary.totalConversations} helper="All tenants" />
          <StatTile icon={<Globe2 className="h-5 w-5" />} label="Capture On" value={summary.websiteCaptureEnabledCount} helper="Website capture enabled" />
          <StatTile icon={<MessageSquareText className="h-5 w-5" />} label="WhatsApp" value={summary.whatsappConfiguredCount} helper="Configured senders" />
          <StatTile icon={<KeyRound className="h-5 w-5" />} label="Billing Groups" value={summary.billingStatusSummary.length} helper="Plan/status buckets" />
        </section>

        <section className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-5 shadow-[0_18px_50px_hsl(222_47%_3%/0.32)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Users</h2>
              <p className="mt-1 text-sm text-muted-foreground">Safe account fields and setup signals. Site keys are hidden.</p>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, website, plan..."
                className="h-11 rounded-2xl pl-9"
              />
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <div className="min-w-[980px] space-y-2">
              <div className="grid grid-cols-[1.5fr_1fr_0.7fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <span>User</span>
                <span>Plan</span>
                <span>Leads</span>
                <span>Convos</span>
                <span>Capture</span>
                <span>WhatsApp</span>
                <span>Last login</span>
              </div>

              {isLoading ? (
                <div className="rounded-2xl border border-border/70 bg-secondary/20 p-5 text-sm text-muted-foreground">Loading admin users...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-border/70 bg-secondary/20 p-5 text-sm text-muted-foreground">No users match this search.</div>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className="grid w-full grid-cols-[1.5fr_1fr_0.7fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 rounded-2xl border border-border/70 bg-secondary/20 px-3 py-4 text-left transition-colors hover:border-primary/40 hover:bg-secondary/35"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{user.fullName}</span>
                      <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                    </span>
                    <span className="space-y-1">
                      <SmallBadge className={statusTone(user.subscriptionStatus)}>
                        {user.subscriptionPlan} / {user.subscriptionStatus}
                      </SmallBadge>
                    </span>
                    <span className="text-sm text-foreground">{user.leadCount}</span>
                    <span className="text-sm text-foreground">{user.conversationCount}</span>
                    <span className="text-sm text-muted-foreground">{user.publicCaptureEnabled ? "Enabled" : "Off"}</span>
                    <span className="truncate text-sm text-muted-foreground">{user.whatsappNumber || "Missing"}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(user.lastLoginAt)}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-border/80 bg-card/70 p-5">
          <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Billing Status Buckets</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {summary.billingStatusSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No billing status data yet.</p>
            ) : (
              summary.billingStatusSummary.map((item) => (
                <SmallBadge key={`${item.plan}-${item.status}`} className={statusTone(item.status)}>
                  {item.plan} / {item.status}: {item.count}
                </SmallBadge>
              ))
            )}
          </div>
        </section>

        <Dialog
          open={Boolean(selectedUserId)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedUserId(null);
              setSelectedUser(null);
            }
          }}
        >
          <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>User support detail</DialogTitle>
              <DialogDescription>Read-only safe account and routing diagnostics. No secrets are exposed.</DialogDescription>
            </DialogHeader>

            {isDetailLoading ? (
              <div className="rounded-2xl border border-border/70 bg-secondary/20 p-5 text-sm text-muted-foreground">Loading user detail...</div>
            ) : selectedUser ? (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                    <p className="text-sm font-medium text-foreground">{selectedUser.account.fullName}</p>
                    <p className="mt-1 break-all text-sm text-muted-foreground">{selectedUser.account.email}</p>
                    <p className="mt-3 text-xs text-muted-foreground">Created: {formatDate(selectedUser.account.createdAt)}</p>
                    <p className="text-xs text-muted-foreground">Last login: {formatDate(selectedUser.account.lastLoginAt)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                    <p className="text-sm font-medium text-foreground">Subscription</p>
                    <div className="mt-2">
                      <SmallBadge className={statusTone(selectedUser.account.subscriptionStatus)}>
                        {selectedUser.account.subscriptionPlan} / {selectedUser.account.subscriptionStatus}
                      </SmallBadge>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {selectedUser.counts.leads} leads / {selectedUser.counts.conversations} conversations
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                    <p className="text-sm font-medium text-foreground">Website routing</p>
                    <p className="mt-2 break-all text-sm text-muted-foreground">URL: {selectedUser.settings.websiteUrl || "Missing"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Capture: {selectedUser.settings.publicCaptureEnabled ? "Enabled" : "Disabled"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Site key: {selectedUser.settings.hasPublicCaptureSiteKey ? selectedUser.settings.maskedPublicCaptureSiteKey : "Missing"}
                    </p>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Allowed origins</p>
                      {selectedUser.settings.allowedOrigins.length === 0 ? (
                        <p className="text-sm text-muted-foreground">None configured</p>
                      ) : (
                        selectedUser.settings.allowedOrigins.map((origin) => (
                          <p key={origin} className="break-all rounded-xl bg-background/40 px-3 py-2 font-mono text-xs text-muted-foreground">
                            {origin}
                          </p>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                    <p className="text-sm font-medium text-foreground">AI and WhatsApp</p>
                    <p className="mt-2 text-sm text-muted-foreground">Business type: {selectedUser.settings.businessType}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Tone: {selectedUser.settings.tone || "Missing"}</p>
                    <p className="mt-1 break-all text-sm text-muted-foreground">WhatsApp: {selectedUser.settings.whatsappNumber || "Missing"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Automation: {selectedUser.settings.automationEnabled ? "Enabled" : "Disabled"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Knowledge refreshed: {formatDate(selectedUser.settings.websiteKnowledgeUpdatedAt)}</p>
                    {selectedUser.settings.websiteKnowledgeError ? (
                      <p className="mt-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {selectedUser.settings.websiteKnowledgeError}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">Recent leads</p>
                    </div>
                    <div className="space-y-2">
                      {selectedUser.recentLeads.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No leads yet.</p>
                      ) : (
                        selectedUser.recentLeads.map((lead) => (
                          <div key={lead.id} className="rounded-xl bg-background/40 px-3 py-2">
                            <p className="truncate text-sm font-medium text-foreground">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {lead.source} / {lead.status} / {formatDate(lead.lastContactAt || lead.createdAt)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <MessageSquareText className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium text-foreground">Recent conversations</p>
                    </div>
                    <div className="space-y-2">
                      {selectedUser.recentConversations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No conversations yet.</p>
                      ) : (
                        selectedUser.recentConversations.map((conversation) => (
                          <div key={conversation.id} className="rounded-xl bg-background/40 px-3 py-2">
                            <p className="truncate text-sm font-medium text-foreground">
                              {conversation.channel} / {conversation.mode} / {conversation.status}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {conversation.messageCount} messages / {formatDate(conversation.lastMessageAt)}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-secondary/20 p-5 text-sm text-muted-foreground">No user selected.</div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
