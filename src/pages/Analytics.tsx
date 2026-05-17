import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  Activity,
  Bot,
  CalendarCheck,
  Clock3,
  Globe2,
  MessageCircle,
  MessageSquareText,
  MousePointer2,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAppData } from "@/context/AppDataContext";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type TrendPoint = {
  date: string;
  label: string;
  count: number;
};

type SourceBreakdown = {
  source: string;
  label: string;
  count: number;
  percentage: number;
};

type ModeBreakdown = {
  mode: string;
  label: string;
  count: number;
  percentage: number;
};

type ActivityItem = {
  id: string;
  type: "lead" | "conversation" | "demo" | "followup" | string;
  title: string;
  detail: string;
  occurredAt: string;
};

type AnalyticsSummary = {
  totalLeads: number;
  newLeads7d: number;
  newLeads30d: number;
  activeConversations: number;
  aiConversations: number;
  manualConversations: number;
  websiteLeads: number;
  whatsappLeads: number;
  whatsappAdLeads: number;
  followUpEligibleLeads: number;
  demoRequests: number;
  convertedLeads: number;
  conversionRate: number;
  totalMessages: number;
  leadMessages: number;
  aiMessages: number;
  agentMessages: number;
  totalConversations: number;
};

type AnalyticsData = {
  summary: AnalyticsSummary;
  trends: {
    leadsOverTime: TrendPoint[];
    conversationsOverTime: TrendPoint[];
  };
  breakdowns: {
    leadSources: SourceBreakdown[];
    conversationModes: ModeBreakdown[];
  };
  recentActivity: ActivityItem[];
};

interface AnalyticsApiResponse {
  data?: Partial<AnalyticsData> & {
    conversionRate?: number;
    totalMessages?: number;
    leadsConverted?: number;
  };
  message?: string;
}

const emptySummary: AnalyticsSummary = {
  totalLeads: 0,
  newLeads7d: 0,
  newLeads30d: 0,
  activeConversations: 0,
  aiConversations: 0,
  manualConversations: 0,
  websiteLeads: 0,
  whatsappLeads: 0,
  whatsappAdLeads: 0,
  followUpEligibleLeads: 0,
  demoRequests: 0,
  convertedLeads: 0,
  conversionRate: 0,
  totalMessages: 0,
  leadMessages: 0,
  aiMessages: 0,
  agentMessages: 0,
  totalConversations: 0,
};

const emptyAnalytics: AnalyticsData = {
  summary: emptySummary,
  trends: {
    leadsOverTime: [],
    conversationsOverTime: [],
  },
  breakdowns: {
    leadSources: [],
    conversationModes: [],
  },
  recentActivity: [],
};

const sourceColors = ["hsl(var(--primary))", "hsl(160 84% 45%)", "hsl(38 92% 55%)", "hsl(286 70% 65%)", "hsl(199 89% 58%)", "hsl(215 16% 65%)"];
const modeColors: Record<string, string> = {
  ai: "hsl(var(--primary))",
  manual: "hsl(38 92% 55%)",
};

const trendChartConfig = {
  leads: {
    label: "Leads",
    color: "hsl(var(--primary))",
  },
  conversations: {
    label: "Conversations",
    color: "hsl(160 84% 45%)",
  },
} as const;

const sourceChartConfig = {
  count: {
    label: "Leads",
    color: "hsl(var(--primary))",
  },
} as const;

const modeChartConfig = {
  count: {
    label: "Conversations",
    color: "hsl(var(--primary))",
  },
} as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value || 0);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildLocalAnalytics(data: ReturnType<typeof useAppData>["data"]): AnalyticsData {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const leads = data.leads;
  const conversations = data.conversations;
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((lead) => lead.status === "Converted").length;
  const totalConversations = conversations.length;
  const aiConversations = conversations.filter((conversation) => conversation.mode === "ai").length;
  const manualConversations = conversations.filter((conversation) => conversation.mode === "manual").length;
  const allMessages = conversations.flatMap((conversation) => conversation.messages);
  const sourceCounts = leads.reduce<Record<string, number>>((counts, lead) => {
    const source = lead.source || "other";
    counts[source] = (counts[source] || 0) + 1;
    return counts;
  }, {});

  return {
    summary: {
      totalLeads,
      newLeads7d: leads.filter((lead) => Date.parse(lead.createdAt || "") >= now - 7 * dayMs).length,
      newLeads30d: leads.filter((lead) => Date.parse(lead.createdAt || "") >= now - 30 * dayMs).length,
      activeConversations: conversations.filter((conversation) => conversation.status === "Active" || conversation.status === "Pending reply").length,
      aiConversations,
      manualConversations,
      websiteLeads: sourceCounts.website || 0,
      whatsappLeads: sourceCounts.whatsapp || 0,
      whatsappAdLeads: sourceCounts.whatsapp_ad || 0,
      followUpEligibleLeads: conversations.filter((conversation) => conversation.followUpState?.nextFollowUpAt).length,
      demoRequests: conversations.filter((conversation) => {
        const knownFields = conversation.qualificationState?.knownFields;
        return Boolean(knownFields?.preferredDemoTime || knownFields?.readiness === "demo_requested" || knownFields?.readiness === "contact_collected");
      }).length,
      convertedLeads,
      conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
      totalMessages: allMessages.length,
      leadMessages: allMessages.filter((message) => message.from === "lead").length,
      aiMessages: allMessages.filter((message) => message.from === "ai").length,
      agentMessages: allMessages.filter((message) => message.from === "agent").length,
      totalConversations,
    },
    trends: {
      leadsOverTime: [],
      conversationsOverTime: [],
    },
    breakdowns: {
      leadSources: Object.entries(sourceCounts).map(([source, count]) => ({
        source,
        label: source.replace(/_/g, " "),
        count,
        percentage: totalLeads ? Math.round((count / totalLeads) * 100) : 0,
      })),
      conversationModes: [
        { mode: "ai", label: "AI handled", count: aiConversations, percentage: totalConversations ? Math.round((aiConversations / totalConversations) * 100) : 0 },
        { mode: "manual", label: "Manual handled", count: manualConversations, percentage: totalConversations ? Math.round((manualConversations / totalConversations) * 100) : 0 },
      ].filter((item) => item.count > 0),
    },
    recentActivity: [],
  };
}

function mergeAnalytics(payload: AnalyticsApiResponse["data"], fallback: AnalyticsData): AnalyticsData {
  if (!payload?.summary) {
    return {
      ...fallback,
      summary: {
        ...fallback.summary,
        conversionRate: payload?.conversionRate ?? fallback.summary.conversionRate,
        totalMessages: payload?.totalMessages ?? fallback.summary.totalMessages,
        convertedLeads: payload?.leadsConverted ?? fallback.summary.convertedLeads,
      },
    };
  }

  return {
    summary: { ...emptySummary, ...payload.summary },
    trends: {
      leadsOverTime: payload.trends?.leadsOverTime || [],
      conversationsOverTime: payload.trends?.conversationsOverTime || [],
    },
    breakdowns: {
      leadSources: payload.breakdowns?.leadSources || [],
      conversationModes: payload.breakdowns?.conversationModes || [],
    },
    recentActivity: payload.recentActivity || [],
  };
}

function InsightPanel({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-4 shadow-[0_18px_50px_hsl(222_47%_3%/0.35)] sm:p-6",
        className,
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="mb-5 flex flex-col gap-1">
        <h2 className="font-display text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function EmptyAnalyticsState() {
  return (
    <div className="rounded-[24px] border border-dashed border-border/80 bg-secondary/20 p-6 text-center sm:p-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-5 w-5" />
      </div>
      <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Analytics will fill in as leads arrive</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Connect WhatsApp, enable website capture, or add your first lead. Once conversations start, this page will show source mix, AI handling, demo intent, and follow-up activity.
      </p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild>
          <Link to="/settings#website-capture">Set up lead capture</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/leads">View leads</Link>
        </Button>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data } = useAppData();
  const fallbackAnalytics = useMemo(() => buildLocalAnalytics(data), [data]);
  const [analytics, setAnalytics] = useState<AnalyticsData>(fallbackAnalytics);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    setAnalytics(fallbackAnalytics);
  }, [fallbackAnalytics]);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      try {
        const response = await apiFetch("/api/analytics");
        const payload = await parseApiJson<AnalyticsApiResponse>(response);

        if (!response.ok) {
          throw new Error(payload.message || "Unable to fetch analytics.");
        }

        if (!cancelled) {
          setAnalytics(mergeAnalytics(payload.data, fallbackAnalytics));
          setApiError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setAnalytics(fallbackAnalytics);
          setApiError(error instanceof Error ? error.message : "Unable to fetch analytics.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [fallbackAnalytics]);

  const summary = analytics.summary;
  const hasData = summary.totalLeads > 0 || summary.totalConversations > 0 || summary.totalMessages > 0;
  const trendData = useMemo(
    () =>
      analytics.trends.leadsOverTime.map((point, index) => ({
        ...point,
        leads: point.count,
        conversations: analytics.trends.conversationsOverTime[index]?.count || 0,
      })),
    [analytics.trends.conversationsOverTime, analytics.trends.leadsOverTime],
  );
  const sourceBreakdown = analytics.breakdowns.leadSources.filter((item) => item.count > 0);
  const modeBreakdown = analytics.breakdowns.conversationModes.filter((item) => item.count > 0);
  const messageTotal = Math.max(1, summary.totalMessages);

  return (
    <AppLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold text-foreground sm:text-4xl">Analytics</h1>
            <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
              Understand where leads come from, how conversations are handled, and which moments are turning into demo intent.
            </p>
          </div>
          <div className="rounded-full border border-border/70 bg-secondary/35 px-4 py-2 text-xs font-medium text-muted-foreground">
            {apiError ? "Showing local fallback" : isLoading ? "Syncing analytics" : "Live backend analytics"}
          </div>
        </header>

        {!hasData ? <EmptyAnalyticsState /> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} title="Total Leads" value={formatNumber(summary.totalLeads)} change={`${summary.newLeads7d} new in 7 days`} changeType="positive" />
          <StatCard icon={TrendingUp} title="30 Day Leads" value={formatNumber(summary.newLeads30d)} change="Recent lead volume" changeType="neutral" />
          <StatCard icon={MessageSquareText} title="Active Conversations" value={formatNumber(summary.activeConversations)} change={`${summary.aiConversations} AI / ${summary.manualConversations} manual`} changeType="neutral" />
          <StatCard icon={CalendarCheck} title="Demo Requests" value={formatNumber(summary.demoRequests)} change={`${summary.conversionRate}% converted`} changeType={summary.demoRequests > 0 ? "positive" : "neutral"} />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Globe2} title="Website Leads" value={formatNumber(summary.websiteLeads)} change="Captured from site forms" changeType="neutral" />
          <StatCard icon={MessageCircle} title="WhatsApp Leads" value={formatNumber(summary.whatsappLeads)} change={`${summary.whatsappAdLeads} from ads`} changeType="neutral" />
          <StatCard icon={Bot} title="AI Conversations" value={formatNumber(summary.aiConversations)} change="Autopilot coverage" changeType="positive" />
          <StatCard icon={Clock3} title="Follow-Up Eligible" value={formatNumber(summary.followUpEligibleLeads)} change="Waiting on lead reply" changeType="neutral" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
          <InsightPanel title="Lead and conversation trend" description="Daily creation volume over the last 14 days. Empty days remain visible so spikes are easy to spot.">
            {trendData.some((point) => point.leads > 0 || point.conversations > 0) ? (
              <ChartContainer config={trendChartConfig} className="h-[300px] w-full">
                <AreaChart data={trendData} margin={{ left: 0, right: 12, top: 12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-leads)" stopOpacity={0.34} />
                      <stop offset="95%" stopColor="var(--color-leads)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="conversationsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-conversations)" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="var(--color-conversations)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={18} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area dataKey="leads" type="monotone" stroke="var(--color-leads)" fill="url(#leadsGradient)" strokeWidth={2} />
                  <Area dataKey="conversations" type="monotone" stroke="var(--color-conversations)" fill="url(#conversationsGradient)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center rounded-[20px] border border-dashed border-border/70 bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
                New leads and conversations will appear here once activity starts.
              </div>
            )}
          </InsightPanel>

          <InsightPanel title="AI vs manual handling" description="Conversation ownership split across automation and human takeover.">
            {modeBreakdown.length > 0 ? (
              <div className="space-y-5">
                <ChartContainer config={modeChartConfig} className="mx-auto h-[220px] w-full max-w-[320px]">
                  <PieChart>
                    <Pie data={modeBreakdown} dataKey="count" nameKey="label" innerRadius={58} outerRadius={86} paddingAngle={4}>
                      {modeBreakdown.map((entry, index) => (
                        <Cell key={entry.mode} fill={modeColors[entry.mode] || sourceColors[index % sourceColors.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                  </PieChart>
                </ChartContainer>
                <div className="space-y-3">
                  {modeBreakdown.map((item, index) => (
                    <div key={item.mode} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: modeColors[item.mode] || sourceColors[index % sourceColors.length] }} />
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-border/70 bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
                Conversation handling split appears after your first lead conversation.
              </div>
            )}
          </InsightPanel>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.05fr)]">
          <InsightPanel title="Lead source breakdown" description="Where pipeline is entering JafLeadX. Percentages are based on total leads.">
            {sourceBreakdown.length > 0 ? (
              <div className="space-y-4">
                <ChartContainer config={sourceChartConfig} className="h-[240px] w-full">
                  <BarChart data={sourceBreakdown} layout="vertical" margin={{ left: 8, right: 18, top: 6, bottom: 6 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={96} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" radius={[0, 10, 10, 0]}>
                      {sourceBreakdown.map((entry, index) => (
                        <Cell key={entry.source} fill={sourceColors[index % sourceColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                <div className="space-y-3">
                  {sourceBreakdown.map((item, index) => (
                    <div key={item.source}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-foreground">{item.label}</span>
                        <span className="text-muted-foreground">
                          {item.count} leads • {item.percentage}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(3, item.percentage)}%`, backgroundColor: sourceColors[index % sourceColors.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[220px] items-center justify-center rounded-[20px] border border-dashed border-border/70 bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
                Lead source data appears once leads are captured or added.
              </div>
            )}
          </InsightPanel>

          <InsightPanel title="Conversation intelligence" description="Useful operating signals from messages, demos, and follow-up readiness.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  Message mix
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Lead", value: summary.leadMessages, color: "hsl(199 89% 58%)" },
                    { label: "AI", value: summary.aiMessages, color: "hsl(var(--primary))" },
                    { label: "Agent", value: summary.agentMessages, color: "hsl(38 92% 55%)" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{item.label}</span>
                        <span>{formatNumber(item.value)}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-background/60">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(2, Math.round((item.value / messageTotal) * 100))}%`, backgroundColor: item.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <MousePointer2 className="h-4 w-4 text-primary" />
                  Conversion path
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{formatNumber(summary.demoRequests)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Demo/contact intent</p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{formatNumber(summary.convertedLeads)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Converted leads</p>
                  </div>
                  <div className="col-span-2 rounded-xl border border-border/60 bg-background/35 px-3 py-2 text-xs text-muted-foreground">
                    {summary.followUpEligibleLeads > 0
                      ? `${summary.followUpEligibleLeads} conversations are ready for safe follow-up checks.`
                      : "No leads are currently waiting in the follow-up queue."}
                  </div>
                </div>
              </div>
            </div>
          </InsightPanel>
        </section>

        <InsightPanel title="Recent activity" description="Latest lead, conversation, demo, and follow-up signals from the backend.">
          {analytics.recentActivity.length > 0 ? (
            <div className="divide-y divide-border/70 overflow-hidden rounded-[20px] border border-border/70">
              {analytics.recentActivity.map((item) => {
                const Icon = item.type === "lead" ? Users : item.type === "demo" ? CalendarCheck : item.type === "followup" ? Clock3 : Activity;

                return (
                  <div key={item.id} className="flex flex-col gap-3 bg-secondary/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(item.occurredAt)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-border/70 bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
              Activity will appear here as leads, conversations, demo requests, and follow-ups happen.
            </div>
          )}
        </InsightPanel>
      </div>
    </AppLayout>
  );
}
