import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MessageSquareText, PhoneCall, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch, buildApiUrl, parseApiJson } from "@/lib/api-client";
import { useAppData } from "@/context/AppDataContext";
import type { FaqItem, Settings } from "@/types/app";

interface SettingsApiResponse {
  data?: {
    settings?: Partial<Settings>;
  };
  message?: string;
}

const businessTypes = [
  { value: "real_estate", label: "Real Estate" },
  { value: "gym", label: "Gym / Fitness" },
  { value: "clinic", label: "Clinic / Healthcare" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
];

export default function Onboarding() {
  const { data, saveSettings } = useAppData();
  const [businessType, setBusinessType] = useState(data.settings.businessType);
  const [whatsappNumber, setWhatsappNumber] = useState(data.settings.whatsappNumber);
  const [faqs, setFaqs] = useState<FaqItem[]>(
    data.settings.faqs.length > 0 ? data.settings.faqs.slice(0, 3) : [{ id: 1, question: "", answer: "" }],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const response = await apiFetch("/api/settings");
        const payload = await parseApiJson<SettingsApiResponse>(response);

        if (!response.ok) {
          throw new Error(payload.message || "Unable to load onboarding settings.");
        }

        const settings = payload.data?.settings;
        if (!cancelled && settings) {
          setBusinessType(settings.businessType || data.settings.businessType);
          setWhatsappNumber(settings.whatsappNumber || data.settings.whatsappNumber);
          setFaqs(
            Array.isArray(settings.faqs) && settings.faqs.length > 0
              ? settings.faqs.slice(0, 3).map((faq, index) => ({
                  id: faq.id ?? index + 1,
                  question: faq.question ?? "",
                  answer: faq.answer ?? "",
                }))
              : [{ id: 1, question: "", answer: "" }],
          );
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Unable to load onboarding settings.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [data.settings.businessType, data.settings.faqs, data.settings.whatsappNumber]);

  const faqCompletionCount = useMemo(
    () => faqs.filter((faq) => faq.question.trim() && faq.answer.trim()).length,
    [faqs],
  );

  const updateFaq = (id: number, patch: Partial<FaqItem>) => {
    setFaqs((current) => current.map((faq) => (faq.id === id ? { ...faq, ...patch } : faq)));
  };

  const handleSave = async () => {
    const nextSettings: Settings = {
      ...data.settings,
      businessType,
      whatsappNumber: whatsappNumber.trim(),
      faqs: faqs
        .map((faq, index) => ({
          id: index + 1,
          question: faq.question.trim(),
          answer: faq.answer.trim(),
        }))
        .filter((faq) => faq.question && faq.answer),
    };

    if (!nextSettings.whatsappNumber) {
      toast.error("WhatsApp number is required.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiFetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nextSettings),
      });
      const payload = await parseApiJson<SettingsApiResponse>(response);

      if (!response.ok) {
        throw new Error(payload.message || "Unable to save onboarding details.");
      }

      saveSettings(nextSettings);
      setIsComplete(true);
      toast.success("Onboarding saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save onboarding details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.16),transparent_36%),linear-gradient(180deg,hsl(224_33%_10%),hsl(224_35%_7%))] px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="space-y-3 text-center">
          <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Onboarding
          </span>
          <h1 className="font-display text-4xl font-semibold tracking-[-0.04em]">Set up your lead assistant</h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-muted-foreground">
            We just need a few details before your dashboard is ready. This helps the AI answer leads correctly and gets your WhatsApp inbox connected faster.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[30px] border border-border/70 bg-card/95 p-6 shadow-[0_24px_70px_hsl(222_47%_3%/0.3)]">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-3xl border border-border/70 bg-secondary/20 p-4">
                <Store className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-medium">1. Business type</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">Tell us what kind of business you run.</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-secondary/20 p-4">
                <PhoneCall className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-medium">2. WhatsApp number</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">This is the number leads will message.</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-secondary/20 p-4">
                <MessageSquareText className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-medium">3. FAQs</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">Give the AI a few answers it should know.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-5">
              <div className="space-y-2">
                <Label>Business Type</Label>
                <Select value={businessType} onValueChange={setBusinessType} disabled={isLoading}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>WhatsApp Number</Label>
                <Input
                  value={whatsappNumber}
                  onChange={(event) => setWhatsappNumber(event.target.value)}
                  placeholder="+91 98765 43210"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label>Frequently Asked Questions</Label>
                  <p className="text-xs leading-6 text-muted-foreground">
                    Add up to 3 FAQs. These answers help the AI respond more accurately.
                  </p>
                </div>

                {faqs.map((faq, index) => (
                  <div key={faq.id} className="rounded-3xl border border-border/70 bg-secondary/20 p-4">
                    <div className="space-y-2">
                      <Label>Question {index + 1}</Label>
                      <Input
                        value={faq.question}
                        onChange={(event) => updateFaq(faq.id, { question: event.target.value })}
                        placeholder="Do you offer free consultations?"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="mt-3 space-y-2">
                      <Label>Answer</Label>
                      <Textarea
                        value={faq.answer}
                        onChange={(event) => updateFaq(faq.id, { answer: event.target.value })}
                        placeholder="Yes, we offer a free 15-minute intro call for new leads."
                        disabled={isLoading}
                        className="min-h-[96px]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  {faqCompletionCount} of {faqs.length} FAQs completed
                </p>
                <Button type="button" onClick={() => void handleSave()} disabled={isSaving || isLoading} className="h-11 rounded-2xl px-6">
                  {isSaving ? "Saving..." : "Save and continue"}
                </Button>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[30px] border border-primary/20 bg-primary/10 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Connect WhatsApp</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em]">Use this webhook URL</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                After saving, paste this into your Twilio WhatsApp sender or sandbox incoming webhook field.
              </p>

              <div className="mt-5 rounded-2xl border border-border/70 bg-background/60 p-4 text-sm">
                <p className="font-medium text-foreground">Webhook URL</p>
                <p className="mt-2 break-all text-muted-foreground">{buildApiUrl("/api/twilio/webhook")}</p>
              </div>

              <ol className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
                <li>1. Open your Twilio WhatsApp sender settings.</li>
                <li>2. Paste the webhook URL into the incoming message webhook field.</li>
                <li>3. Send a test WhatsApp message to confirm lead capture is working.</li>
              </ol>
            </section>

            <section className="rounded-[30px] border border-border/70 bg-card/95 p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className={`mt-0.5 h-5 w-5 ${isComplete ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <h3 className="font-medium text-foreground">Finish setup</h3>
                  <p className="mt-1 text-sm leading-7 text-muted-foreground">
                    Save your onboarding details, then continue to the dashboard and start testing your first lead flow.
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <Button asChild disabled={!isComplete}>
                  <Link to="/dashboard">Go to dashboard</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/settings">Open full settings</Link>
                </Button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
