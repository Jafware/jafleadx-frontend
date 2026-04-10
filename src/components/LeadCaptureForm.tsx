import { FormEvent, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareQuote, Phone, Send, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";

import { buildApiUrl, parseApiJson } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface LeadCaptureResponse {
  data?: {
    lead?: {
      id?: string | number;
      name?: string;
    };
  };
  message?: string;
}

const initialForm = {
  name: "",
  phone: "",
  message: "",
};

export function LeadCaptureForm({ className }: { className?: string }) {
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      toast.error("Please complete name, phone, and message.");
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage("");

    try {
      const response = await fetch(buildApiUrl("${import.meta.env.VITE_API_BASE_URL}/api/leads/capture"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          message: form.message.trim(),
        }),
      });

      const payload = await parseApiJson<LeadCaptureResponse>(response);

      if (!response.ok) {
        throw new Error(payload.message || "Unable to capture lead.");
      }

      const nextMessage = payload.data?.lead?.name?.trim()
        ? `Thanks, ${payload.data.lead.name}. We received your message.`
        : "Thanks, we received your message.";

      setForm(initialForm);
      setSuccessMessage(nextMessage);
      toast.success("Lead captured successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to capture lead.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-white/10 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.18),transparent_38%),linear-gradient(180deg,hsl(220_32%_10%),hsl(224_34%_7%))] text-white shadow-[0_28px_70px_hsl(220_60%_4%/0.45)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,transparent,hsl(var(--primary)/0.18),transparent)] blur-2xl" />
      <CardHeader className="space-y-4 pb-5">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/70">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Instant lead capture
        </div>
        <div className="space-y-2">
          <CardTitle className="font-display text-2xl tracking-[-0.03em] text-white sm:text-[2rem]">
            Start the conversation while intent is high
          </CardTitle>
          <CardDescription className="max-w-md text-sm leading-6 text-white/70">
            Capture a lead, store the first message, and trigger an AI reply in one smooth handoff.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {successMessage ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{successMessage}</p>
            </div>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-white/85" htmlFor="lead-capture-name">
                Name
              </Label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  id="lead-capture-name"
                  placeholder="Jane Smith"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/35 focus-visible:ring-primary/60 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white/85" htmlFor="lead-capture-phone">
                Phone
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  id="lead-capture-phone"
                  placeholder="+1 555 010 200"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  className="h-12 border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/35 focus-visible:ring-primary/60 focus-visible:ring-offset-0"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white/85" htmlFor="lead-capture-message">
              Message
            </Label>
            <div className="relative">
              <MessageSquareQuote className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-white/35" />
              <Textarea
                id="lead-capture-message"
                placeholder="Tell us what you need and we’ll follow up right away."
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                className="min-h-[132px] border-white/10 bg-white/5 pl-10 text-white placeholder:text-white/35 focus-visible:ring-primary/60 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-white/60">Clean on mobile, fast on desktop, and ready to hand off to AI.</p>
            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="h-12 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_18px_40px_hsl(var(--primary)/0.28)]"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isSubmitting ? "Sending..." : "Capture lead"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
