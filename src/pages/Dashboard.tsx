import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { useAppData } from "@/context/AppDataContext";
import { useBilling } from "@/context/BillingContext";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  ArrowUpRight,
  MessageSquare,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const statusColor: Record<string, string> = {
  Active: "bg-success/12 text-success border-success/20",
  "Pending reply": "bg-warning/12 text-warning border-warning/20",
  Closed: "bg-muted text-muted-foreground border-border",
};

const graphPoints = [
  { label: "Mon", leads: 14, replies: 10 },
  { label: "Tue", leads: 18, replies: 13 },
  { label: "Wed", leads: 22, replies: 16 },
  { label: "Thu", leads: 20, replies: 15 },
  { label: "Fri", leads: 27, replies: 21 },
  { label: "Sat", leads: 24, replies: 18 },
  { label: "Sun", leads: 30, replies: 24 },
];

interface DashboardStatsResponse {
  data?: {
    totalLeads?: number;
    activeConversations?: number;
    conversions?: number;
    responseRate?: number;
  };
  message?: string;
}

export default function Dashboard() {
  const { data } = useAppData();
  const { currentPlan } = useBilling();

  const fallbackTotalLeads = data.leads.length;
  const fallbackActiveConversations = data.conversations.filter((item) => item.status === "Active").length;
  const fallbackConversions = data.leads.filter((item) => item.status === "Converted").length;
  const respondedConversations = data.conversations.filter((conversation) =>
    conversation.messages.some((message) => message.from === "ai" || message.from === "agent"),
  ).length;
  const fallbackResponseRate = data.conversations.length
    ? Math.round((respondedConversations / data.conversations.length) * 100)
    : 0;
  const [stats, setStats] = useState({
    totalLeads: fallbackTotalLeads,
    activeConversations: fallbackActiveConversations,
    conversions: fallbackConversions,
    responseRate: fallbackResponseRate,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchDashboardStats = async () => {
      setStatsLoading(true);

      try {
        const response = await apiFetch("/api/dashboard/stats");
        const payload = await parseApiJson<DashboardStatsResponse>(response);

        if (!response.ok) {
          throw new Error(payload.message || "Unable to load dashboard stats.");
        }

        if (!cancelled) {
          setStats({
            totalLeads: payload.data?.totalLeads ?? fallbackTotalLeads,
            activeConversations: payload.data?.activeConversations ?? fallbackActiveConversations,
            conversions: payload.data?.conversions ?? fallbackConversions,
            responseRate: payload.data?.responseRate ?? fallbackResponseRate,
          });
          setStatsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setStats({
            totalLeads: fallbackTotalLeads,
            activeConversations: fallbackActiveConversations,
            conversions: fallbackConversions,
            responseRate: fallbackResponseRate,
          });
          setStatsError(error instanceof Error ? `${error.message} Showing local app data.` : "Live dashboard stats are unavailable. Showing local app data.");
        }
      } finally {
        if (!cancelled) {
          setStatsLoading(false);
        }
      }
    };

    void fetchDashboardStats();

    return () => {
      cancelled = true;
    };
  }, [fallbackActiveConversations, fallbackConversions, fallbackResponseRate, fallbackTotalLeads]);

  const { totalLeads, activeConversations, conversions, responseRate } = stats;

  const recentConversations = [...data.conversations]
    .sort((a, b) => {
      const aDate = a.messages[a.messages.length - 1]?.createdAt || a.messages[a.messages.length - 1]?.time || "";
      const bDate = b.messages[b.messages.length - 1]?.createdAt || b.messages[b.messages.length - 1]?.time || "";
      return String(bDate).localeCompare(String(aDate));
    })
    .slice(0, 4);

  const maxGraphValue = Math.max(...graphPoints.map((point) => Math.max(point.leads, point.replies)));

  return (
    <AppLayout>
      <div className="space-y-10 pb-10">
        <section className="overflow-hidden rounded-[32px] border border-border/80 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_26%),linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] px-6 py-7 shadow-[0_24px_70px_hsl(222_47%_3%/0.45)] sm:px-8 sm:py-8">
          <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <span className="inline-flex w-fit rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                JafLeadX AI Dashboard
              </span>
              <div className="space-y-3">
                <h1 className="max-w-2xl font-display text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl lg:text-[2.8rem]">
                  Lead performance at a glance
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
                  Monitor pipeline health, conversation activity, and response performance from one clean workspace.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
              <div className="rounded-[24px] border border-border/70 bg-secondary/35 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current Plan</p>
                <p className="mt-2 font-display text-xl font-semibold tracking-[-0.03em] text-foreground">{currentPlan.name}</p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-secondary/35 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live Response Rate</p>
                <p className="mt-2 font-display text-xl font-semibold tracking-[-0.03em] text-foreground">{responseRate}%</p>
                <p className="mt-1 text-xs text-muted-foreground">{statsLoading ? "Syncing stats..." : statsError ? "Local fallback" : "API connected"}</p>
              </div>
            </div>
          </div>

          {statsError ? (
            <div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              {statsError}
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} title="Total Leads" value={totalLeads} change="All captured contacts" changeType="neutral" />
            <StatCard
              icon={MessageSquare}
              title="Active Conversations"
              value={activeConversations}
              change="Open chats needing attention"
              changeType="positive"
            />
            <StatCard
              icon={UserCheck}
              title="Conversions"
              value={conversions}
              change="Leads moved to closed-won"
              changeType="positive"
            />
            <StatCard
              icon={TrendingUp}
              title="Response Rate"
              value={`${responseRate}%`}
              change={statsLoading ? "Syncing from dashboard API" : "Loaded from /api/dashboard/stats"}
              changeType="positive"
            />
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
          <div className="rounded-[30px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] px-6 py-7 shadow-[0_24px_70px_hsl(222_47%_3%/0.4)] sm:px-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <h2 className="font-display text-[1.45rem] font-semibold tracking-[-0.03em] text-foreground">Lead & reply trend</h2>
                <p className="max-w-xl text-sm leading-7 text-muted-foreground">Placeholder weekly activity data for the dashboard graph.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  Leads
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Replies
                </span>
              </div>
            </div>

            <div className="mt-8">
              <div className="grid grid-cols-[auto_1fr] gap-4 rounded-[26px] border border-border/70 bg-secondary/15 px-4 pb-5 pt-6 sm:px-6">
                <div className="hidden h-[290px] flex-col justify-between pt-2 text-[11px] font-medium text-muted-foreground md:flex">
                  <span>30</span>
                  <span>24</span>
                  <span>18</span>
                  <span>12</span>
                  <span>6</span>
                  <span>0</span>
                </div>
                <div className="flex h-[290px] items-end gap-3 sm:gap-4">
                {graphPoints.map((point) => (
                  <div key={point.label} className="flex flex-1 items-end gap-2">
                    <div className="flex flex-1 flex-col items-center justify-end gap-3">
                      <div className="flex h-[220px] w-full items-end gap-2">
                        <div
                          className="w-full rounded-t-[18px] bg-primary/90 shadow-[0_10px_30px_hsl(var(--primary)/0.25)]"
                          style={{ height: `${(point.leads / maxGraphValue) * 100}%` }}
                        />
                        <div
                          className="w-full rounded-t-[18px] bg-emerald-400/85 shadow-[0_10px_30px_rgba(52,211,153,0.18)]"
                          style={{ height: `${(point.replies / maxGraphValue) * 100}%` }}
                        />
                      </div>
                      <div className="space-y-1 text-center">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">{point.label}</p>
                        <p className="text-[11px] text-muted-foreground">{point.leads} leads</p>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] px-6 py-7 shadow-[0_24px_70px_hsl(222_47%_3%/0.4)]">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <h2 className="font-display text-[1.45rem] font-semibold tracking-[-0.03em] text-foreground">Performance notes</h2>
                <p className="text-sm leading-7 text-muted-foreground">A quick read on how the pipeline is moving this week.</p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-7 space-y-4">
              <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-5">
                <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">Strong reply coverage</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {responseRate}% of conversations already have a response, keeping first-touch speed healthy.
                </p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-5">
                <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">Conversion momentum</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {conversions} leads are marked converted, giving you a visible pipeline-to-close snapshot.
                </p>
              </div>
              <div className="rounded-[24px] border border-border/70 bg-secondary/30 p-5">
                <p className="text-sm font-semibold tracking-[-0.01em] text-foreground">Active workload</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {activeConversations} live conversations are still open, so your team can prioritize timely follow-up.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] px-6 py-7 shadow-[0_24px_70px_hsl(222_47%_3%/0.4)] sm:px-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h2 className="font-display text-[1.45rem] font-semibold tracking-[-0.03em] text-foreground">Recent conversations</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                A quick preview of the latest lead activity and message status.
              </p>
            </div>
            <Link
              to="/conversations"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-opacity hover:opacity-80"
            >
              View inbox <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            {recentConversations.map((conversation) => {
              const latestMessage = conversation.messages[conversation.messages.length - 1];

              return (
                <article
                  key={conversation.id}
                  className="rounded-[24px] border border-border/70 bg-secondary/15 p-5 transition-colors hover:border-primary/20 hover:bg-secondary/30 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-foreground">{conversation.name}</h3>
                        {conversation.unread ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {conversation.channel} • {conversation.time}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                        statusColor[conversation.status] || "bg-secondary text-muted-foreground border-border",
                      )}
                    >
                      {conversation.status}
                    </span>
                  </div>

                  <p className="mt-5 line-clamp-2 text-sm leading-7 text-muted-foreground">{latestMessage?.text || conversation.lastMsg}</p>

                  <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
                    <div className="text-xs text-muted-foreground">
                      Mode: <span className="font-medium capitalize text-foreground">{conversation.mode}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Messages: <span className="font-medium text-foreground">{conversation.messages.length}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
