import { useEffect, useMemo, useState } from "react";
import { PolarAngleAxis, RadialBar, RadialBarChart, Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart } from "recharts";
import { ArrowUpRight, MessageSquareText, PieChart as PieChartIcon, TrendingUp, UserCheck } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { StatCard } from "@/components/StatCard";
import { useAppData } from "@/context/AppDataContext";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface AnalyticsApiResponse {
  data?: {
    conversionRate?: number;
    totalMessages?: number;
    leadsConverted?: number;
  };
  message?: string;
}

const performanceChartConfig = {
  totalMessages: {
    label: "Messages",
    color: "hsl(var(--primary))",
  },
  leadsConverted: {
    label: "Converted",
    color: "hsl(160 84% 45%)",
  },
} as const;

const conversionChartConfig = {
  conversionRate: {
    label: "Conversion rate",
    color: "hsl(var(--primary))",
  },
  remaining: {
    label: "Open pipeline",
    color: "hsl(215 16% 65% / 0.18)",
  },
} as const;

export default function AnalyticsPage() {
  const { data } = useAppData();
  const localTotalLeads = data.leads.length;
  const localLeadsConverted = data.leads.filter((lead) => lead.status === "Converted").length;
  const localConversionRate = localTotalLeads ? Math.round((localLeadsConverted / localTotalLeads) * 100) : 0;
  const localMessagesSent = data.conversations.reduce(
    (total, conversation) => total + conversation.messages.filter((message) => message.from !== "lead").length,
    0,
  );

  const [analytics, setAnalytics] = useState({
    conversionRate: localConversionRate,
    totalMessages: localMessagesSent,
    leadsConverted: localLeadsConverted,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAnalytics = async () => {
      try {
        const response = await apiFetch("${import.meta.env.VITE_API_BASE_URL}/api/analytics");
        const payload = await parseApiJson<AnalyticsApiResponse>(response);

        if (!response.ok) {
          throw new Error(payload.message || "Unable to fetch analytics.");
        }

        if (!cancelled) {
          setAnalytics({
            conversionRate: payload.data?.conversionRate ?? localConversionRate,
            totalMessages: payload.data?.totalMessages ?? localMessagesSent,
            leadsConverted: payload.data?.leadsConverted ?? localLeadsConverted,
          });
          setApiError(null);
        }
      } catch (error) {
        if (!cancelled) {
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
  }, [localConversionRate, localLeadsConverted, localMessagesSent]);

  const metricChartData = useMemo(
    () => [
      {
        name: "Performance",
        totalMessages: analytics.totalMessages,
        leadsConverted: analytics.leadsConverted,
      },
    ],
    [analytics.leadsConverted, analytics.totalMessages],
  );

  const conversionChartData = useMemo(
    () => [
      {
        name: "conversion",
        conversionRate: analytics.conversionRate,
        remaining: Math.max(0, 100 - analytics.conversionRate),
      },
    ],
    [analytics.conversionRate],
  );

  const outcomeChartData = useMemo(
    () => [
      { name: "Converted", value: analytics.leadsConverted, fill: "var(--color-conversionRate)" },
      { name: "Messages", value: analytics.totalMessages, fill: "var(--color-totalMessages)" },
    ],
    [analytics.leadsConverted, analytics.totalMessages],
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-foreground">Analytics</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Track conversion performance, outbound message volume, and lead outcomes from a clean analytics workspace.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={TrendingUp}
            title="Conversion Rate"
            value={`${analytics.conversionRate}%`}
            change={isLoading ? "Syncing analytics..." : apiError ? "Showing local fallback" : "Live from /api/analytics"}
            changeType={apiError ? "neutral" : "positive"}
          />
          <StatCard
            icon={MessageSquareText}
            title="Messages Sent"
            value={analytics.totalMessages}
            change="AI and agent outbound volume"
            changeType="neutral"
          />
          <StatCard
            icon={UserCheck}
            title="Leads Converted"
            value={analytics.leadsConverted}
            change="Closed-won opportunities"
            changeType="positive"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <div
            className="rounded-[30px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-6 shadow-[0_18px_50px_hsl(222_47%_3%/0.35)]"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Outbound performance</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Live API totals for outbound messages and converted leads.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {apiError ? apiError : isLoading ? "Loading analytics..." : "Backend analytics synced"}
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-border/70 bg-secondary/15 p-4 sm:p-5">
              <ChartContainer config={performanceChartConfig} className="h-[300px] w-full">
                <BarChart data={metricChartData} barGap={18}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="totalMessages" radius={[14, 14, 4, 4]} fill="var(--color-totalMessages)" />
                  <Bar dataKey="leadsConverted" radius={[14, 14, 4, 4]} fill="var(--color-leadsConverted)" />
                </BarChart>
              </ChartContainer>
            </div>
          </div>

          <div className="grid gap-6">
            <div
              className="rounded-[30px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-6 shadow-[0_18px_50px_hsl(222_47%_3%/0.35)]"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/45 text-foreground">
                  <PieChartIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Conversion gauge</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Current conversion rate from the analytics API.</p>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-border/70 bg-secondary/15 p-4">
                <ChartContainer config={conversionChartConfig} className="mx-auto h-[250px] w-full max-w-[320px]">
                  <RadialBarChart
                    data={conversionChartData}
                    innerRadius="60%"
                    outerRadius="100%"
                    startAngle={180}
                    endAngle={0}
                    barSize={24}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="remaining" stackId="a" cornerRadius={24} fill="var(--color-remaining)" />
                    <RadialBar dataKey="conversionRate" stackId="a" cornerRadius={24} fill="var(--color-conversionRate)" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RadialBarChart>
                </ChartContainer>
                <div className="-mt-8 text-center">
                  <p className="font-display text-4xl font-semibold tracking-[-0.04em] text-foreground">{analytics.conversionRate}%</p>
                  <p className="mt-2 text-sm text-muted-foreground">Lead-to-customer conversion efficiency</p>
                </div>
              </div>
            </div>

            <div
              className="rounded-[30px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-6 shadow-[0_18px_50px_hsl(222_47%_3%/0.35)]"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Outcome mix</p>
                  <p className="mt-1 text-sm text-muted-foreground">Quick visual split between converted leads and sent messages.</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-primary" />
              </div>

              <div className="mt-6 rounded-[24px] border border-border/70 bg-secondary/15 p-4">
                <ChartContainer
                  config={{
                    conversionRate: { label: "Converted", color: "hsl(160 84% 45%)" },
                    totalMessages: { label: "Messages", color: "hsl(var(--primary))" },
                  }}
                  className="h-[220px] w-full"
                >
                  <PieChart>
                    <Pie data={outcomeChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={4} />
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
