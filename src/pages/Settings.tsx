import { AppLayout } from "@/components/AppLayout";
import { useAppData } from "@/context/AppDataContext";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import { updateTwilioSettings } from "@/lib/twilio-api";
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
import { BrainCircuit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { FaqItem } from "@/types/app";

interface SettingsApiResponse {
  data?: {
    settings?: {
      businessType?: string;
      whatsappNumber?: string;
      tone?: string;
      faqs?: FaqItem[];
    };
  };
  message?: string;
}

const toneOptions = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "warm", label: "Warm" },
  { value: "confident", label: "Confident" },
  { value: "consultative", label: "Consultative" },
];

const businessTypes = [
  { value: "real_estate", label: "Real Estate" },
  { value: "gym", label: "Gym / Fitness" },
  { value: "clinic", label: "Clinic / Healthcare" },
  { value: "other", label: "Other" },
];

export default function SettingsPage() {
  const { data, saveSettings } = useAppData();
  const [businessType, setBusinessType] = useState(data.settings.businessType);
  const [whatsappNumber, setWhatsappNumber] = useState(data.settings.whatsappNumber);
  const [tone, setTone] = useState(data.settings.tone);
  const [faqs, setFaqs] = useState<FaqItem[]>(
    data.settings.faqs.length > 0 ? data.settings.faqs : [{ id: 1, question: "", answer: "" }],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const response = await apiFetch("/api/settings");
        const payload = await parseApiJson<SettingsApiResponse>(response);

        if (!response.ok) {
          throw new Error(payload.message || "Unable to load settings.");
        }

        const settings = payload.data?.settings;

        if (!cancelled && settings) {
          setBusinessType(settings.businessType || data.settings.businessType);
          setWhatsappNumber(settings.whatsappNumber || data.settings.whatsappNumber);
          setTone(settings.tone || data.settings.tone);
          setFaqs(
            Array.isArray(settings.faqs) && settings.faqs.length > 0
              ? settings.faqs.map((faq, index) => ({
                  id: faq.id ?? index + 1,
                  question: faq.question ?? "",
                  answer: faq.answer ?? "",
                }))
              : data.settings.faqs.length > 0
                ? data.settings.faqs
                : [{ id: 1, question: "", answer: "" }],
          );
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Unable to load settings.");
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
  }, [data.settings.businessType, data.settings.faqs, data.settings.tone, data.settings.whatsappNumber]);

  const updateFaq = (id: number, patch: Partial<FaqItem>) => {
    setFaqs((current) => current.map((faq) => (faq.id === id ? { ...faq, ...patch } : faq)));
  };

  const addFaq = () => {
    setFaqs((current) => [
      ...current,
      {
        id: Math.max(0, ...current.map((faq) => faq.id)) + 1,
        question: "",
        answer: "",
      },
    ]);
  };

  const removeFaq = (id: number) => {
    setFaqs((current) =>
      current.length > 1 ? current.filter((faq) => faq.id !== id) : [{ id: 1, question: "", answer: "" }],
    );
  };

  const handleSave = async () => {
    const nextSettings = {
      ...data.settings,
      businessType,
      whatsappNumber,
      tone,
      faqs: faqs
        .map((faq, index) => ({
          id: index + 1,
          question: faq.question.trim(),
          answer: faq.answer.trim(),
        }))
        .filter((faq) => faq.question || faq.answer),
    };

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
        throw new Error(payload.message || "Unable to save settings.");
      }

      saveSettings(nextSettings);

      try {
        await updateTwilioSettings(nextSettings);
      } catch {
        // Local AI settings should still save even if the sync endpoint is unavailable.
      }

      toast.success("AI settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-foreground">Settings</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Configure the core settings your AI assistant uses when replying to leads.
          </p>
        </div>

        <section
          className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-6 shadow-[0_18px_50px_hsl(222_47%_3%/0.35)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">AI profile</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                These settings shape qualification logic, tone of voice, and the answers your AI can give in chat.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Business Type</Label>
              <Select value={businessType} onValueChange={setBusinessType} disabled={isLoading}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Select a business type" />
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

            <div className="space-y-2">
              <Label>Tone Selection</Label>
              <Select value={tone} onValueChange={setTone} disabled={isLoading}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Select AI tone" />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section
          className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-6 shadow-[0_18px_50px_hsl(222_47%_3%/0.35)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">FAQ knowledge base</h2>
              <p className="mt-1 max-w-2xl text-sm leading-7 text-muted-foreground">
                Add frequently asked questions so the AI can answer common lead questions with better context.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={addFaq} className="h-11 rounded-2xl px-4">
              <Plus className="mr-2 h-4 w-4" />
              Add FAQ
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            {faqs.map((faq, index) => (
              <div key={faq.id} className="rounded-[24px] border border-border/70 bg-secondary/20 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">FAQ {index + 1}</p>
                    <p className="text-xs text-muted-foreground">This content is used directly in AI responses when relevant.</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFaq(faq.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <Input
                    placeholder="Question"
                    className="h-11 rounded-2xl"
                    value={faq.question}
                    disabled={isLoading}
                    onChange={(e) => updateFaq(faq.id, { question: e.target.value })}
                  />
                  <Textarea
                    placeholder="Answer"
                    rows={4}
                    className="rounded-2xl"
                    value={faq.answer}
                    disabled={isLoading}
                    onChange={(e) => updateFaq(faq.id, { answer: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || isLoading} className="h-11 rounded-2xl px-5">
            {isLoading ? "Loading..." : isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
