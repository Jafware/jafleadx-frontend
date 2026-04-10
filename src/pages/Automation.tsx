import { AppLayout } from "@/components/AppLayout";
import { useAppData } from "@/context/AppDataContext";
import { useBilling } from "@/context/BillingContext";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import { updateTwilioSettings } from "@/lib/twilio-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Clock3, MessageSquareDashed, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { FollowUpStep } from "@/types/app";

const timingDescriptions: Record<number, string> = {
  1: "Sent if the lead has not replied after the first hour.",
  2: "Sent one day later to bring the conversation back to the top of the inbox.",
  3: "Sent as the final follow-up three days after no reply.",
};

export default function AutomationPage() {
  const { data, saveSettings } = useAppData();
  const { hasFeature } = useBilling();
  const canUseAutomation = hasFeature("followUpAutomation");
  const [automationEnabled, setAutomationEnabled] = useState(data.settings.automationEnabled);
  const [followUps, setFollowUps] = useState<FollowUpStep[]>(data.settings.followUps);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadAutomationSettings = async () => {
      try {
        const response = await apiFetch("${import.meta.env.VITE_API_BASE_URL}/api/settings");
        const payload = await parseApiJson<{ data?: { settings?: { automationEnabled?: boolean; followUps?: FollowUpStep[] } }; message?: string }>(response);

        if (!response.ok) {
          throw new Error(payload.message || "Unable to load automation settings.");
        }

        const settings = payload.data?.settings;

        if (!cancelled && settings) {
          setAutomationEnabled(settings.automationEnabled ?? true);
          setFollowUps(Array.isArray(settings.followUps) && settings.followUps.length > 0 ? settings.followUps : data.settings.followUps);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Unable to load automation settings.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadAutomationSettings();

    return () => {
      cancelled = true;
    };
  }, [data.settings.followUps]);

  const updateFollowUpMessage = (id: number, message: string) => {
    setFollowUps((current) => current.map((step) => (step.id === id ? { ...step, message } : step)));
  };

  const updateFollowUpTiming = (id: number, delayHours: string) => {
    const parsedDelay = Number(delayHours);

    setFollowUps((current) =>
      current.map((step) =>
        step.id === id
          ? {
              ...step,
              delayHours: Number.isFinite(parsedDelay) && parsedDelay > 0 ? parsedDelay : step.delayHours,
            }
          : step,
      ),
    );
  };

  const handleSave = async () => {
    const nextSettings = {
      ...data.settings,
      automationEnabled,
      followUps: followUps.map((step) => ({
        ...step,
        delayHours: Math.max(1, Number(step.delayHours) || 1),
        message: step.message.trim(),
      })),
    };

    setIsSaving(true);

    try {
      const response = await apiFetch("${import.meta.env.VITE_API_BASE_URL}/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextSettings),
      });
      const payload = await parseApiJson<{ message?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.message || "Unable to save automation settings.");
      }

      saveSettings(nextSettings);

      try {
        await updateTwilioSettings(nextSettings);
      } catch {
        // Local automation settings can still function without server sync.
      }

      toast.success("Automation settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save automation settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-foreground">Automation</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Control your no-reply follow-up flow with simple timing rules, editable messages, and a single automation toggle.
          </p>
        </div>

        <section
          className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-6 shadow-[0_18px_50px_hsl(222_47%_3%/0.35)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Zap className="h-3.5 w-3.5" />
                Follow-up automation
              </div>
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-foreground">Automation on or off</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                When enabled, JafLeadX AI sends follow-ups after 1 hour, 1 day, and 3 days if a lead does not reply.
              </p>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-secondary/30 px-5 py-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Automation status</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {automationEnabled ? "Enabled for no-reply follow-ups" : "Paused until you turn it back on"}
                  </p>
                </div>
                <Switch
                  checked={automationEnabled}
                  onCheckedChange={setAutomationEnabled}
                  disabled={!canUseAutomation}
                  aria-label="Toggle follow-up automation"
                />
              </div>
            </div>
          </div>

          {!canUseAutomation ? (
            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Follow-up automation is available on Growth and Pro plans.
            </div>
          ) : null}
        </section>

        <section
          className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-6 shadow-[0_18px_50px_hsl(222_47%_3%/0.35)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/50 text-foreground">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Follow-up timings</h2>
              <p className="text-sm text-muted-foreground">Your automation sends messages at fixed no-reply checkpoints.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {followUps.map((step) => (
              <div key={step.id} className="rounded-[24px] border border-border/70 bg-secondary/20 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Timing</p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-foreground">{step.label}</p>
                <div className="mt-4 space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Delay in hours</Label>
                  <Input
                    type="number"
                    min={1}
                    value={step.delayHours}
                    disabled={!canUseAutomation || isLoading}
                    onChange={(event) => updateFollowUpTiming(step.id, event.target.value)}
                    className="rounded-2xl"
                  />
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{timingDescriptions[step.id]}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-6 shadow-[0_18px_50px_hsl(222_47%_3%/0.35)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/50 text-foreground">
              <MessageSquareDashed className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Follow-up messages</h2>
              <p className="text-sm text-muted-foreground">
                Edit each message below. You can use <code>{"{{name}}"}</code> and <code>{"{{businessName}}"}</code>.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {followUps.map((step) => (
              <div key={step.id} className="space-y-2 rounded-[24px] border border-border/70 bg-secondary/20 p-5">
                <Label className="text-sm font-medium text-foreground">{step.label} follow-up</Label>
                <Textarea
                  rows={4}
                  value={step.message}
                  disabled={!canUseAutomation || !automationEnabled || isLoading}
                  onChange={(event) => updateFollowUpMessage(step.id, event.target.value)}
                  className="rounded-2xl"
                  placeholder={`Message sent after ${step.label} with no reply`}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="h-11 rounded-2xl px-5"
          >
            {isLoading ? "Loading..." : isSaving ? "Saving..." : "Save Automation"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
