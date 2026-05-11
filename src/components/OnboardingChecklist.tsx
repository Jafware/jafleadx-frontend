import { Link } from "react-router-dom";
import { CheckCircle2, Circle, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface OnboardingItem {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  actionHref: string;
  actionLabel: string;
}

interface OnboardingStatus {
  completed: boolean;
  completedCount: number;
  totalCount: number;
  completionPercentage: number;
  items: OnboardingItem[];
}

interface OnboardingStatusResponse {
  data?: OnboardingStatus;
  message?: string;
}

export function OnboardingChecklist() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await apiFetch("/api/onboarding/status");
      const payload = await parseApiJson<OnboardingStatusResponse>(response);

      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Unable to load onboarding status.");
      }

      setStatus(payload.data);
    } catch {
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadStatus();
      }
    };

    window.addEventListener("focus", loadStatus);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.removeEventListener("focus", loadStatus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadStatus]);

  const nextItem = useMemo(() => status?.items.find((item) => !item.complete) || null, [status]);

  if (isLoading) {
    return (
      <section className="rounded-[30px] border border-border/80 bg-card px-6 py-6 shadow-[0_20px_60px_hsl(222_47%_3%/0.32)]">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading setup checklist...
        </div>
      </section>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <section className="rounded-[30px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_8%))] px-6 py-6 shadow-[0_20px_60px_hsl(222_47%_3%/0.36)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Setup checklist</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {status.completed
                  ? "Your core setup is complete. You can revisit these steps anytime."
                  : "Finish these steps to get your lead capture and AI replies ready."}
              </p>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${status.completionPercentage}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {status.completionPercentage}% complete - {status.completedCount} of {status.totalCount} steps done
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {nextItem ? (
            <Button asChild className="rounded-xl">
              <Link to={nextItem.actionHref}>{nextItem.actionLabel}</Link>
            </Button>
          ) : (
            <Button asChild className="rounded-xl">
              <Link to="/leads">Test another lead</Link>
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => setIsCollapsed((value) => !value)} className="rounded-xl">
            {isCollapsed ? "Show steps" : "Hide steps"}
          </Button>
        </div>
      </div>

      {!isCollapsed ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {status.items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex min-h-[156px] flex-col justify-between rounded-2xl border p-4",
                item.complete
                  ? "border-emerald-400/25 bg-emerald-400/10"
                  : "border-border/70 bg-secondary/20",
              )}
            >
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  {item.complete ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  ) : (
                    <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <h3 className="text-sm font-semibold leading-5 text-foreground">{item.label}</h3>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">{item.description}</p>
              </div>
              <Button asChild variant={item.complete ? "secondary" : "outline"} size="sm" className="mt-4 rounded-lg">
                <Link to={item.actionHref}>{item.complete ? "Review" : item.actionLabel}</Link>
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
