import { AppLayout } from "@/components/AppLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppData } from "@/context/AppDataContext";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Bot, BrainCircuit, Copy, Globe, KeyRound, MessageCircle, Plus, RefreshCw, Shield, Trash2 } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { FaqItem, Settings } from "@/types/app";

interface SettingsApiResponse {
  data?: {
    settings?: Partial<Settings>;
  };
  message?: string;
}

type PublicCaptureSiteKeyAction = "generate" | "regenerate";

interface SettingsUpdatePayload extends Settings {
  publicCaptureSiteKeyAction?: PublicCaptureSiteKeyAction;
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

function normalizeAllowedOrigin(origin: string, lineNumber: number) {
  const value = origin.trim();

  if (!value) {
    return "";
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`Allowed origin on line ${lineNumber} must be a valid origin like https://example.com.`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`Allowed origin on line ${lineNumber} must start with http:// or https://.`);
  }

  if (url.username || url.password) {
    throw new Error(`Allowed origin on line ${lineNumber} cannot include username or password.`);
  }

  if (url.search || url.hash) {
    throw new Error(`Allowed origin on line ${lineNumber} cannot include query params or fragments.`);
  }

  if (url.pathname && url.pathname !== "/") {
    throw new Error(`Allowed origin on line ${lineNumber} must only include the origin, without a path.`);
  }

  return url.origin.toLowerCase();
}

function normalizeAllowedOriginsInput(input: string) {
  const normalizedOrigins: string[] = [];
  const seenOrigins = new Set<string>();

  input.split("\n").forEach((line, index) => {
    const normalizedOrigin = normalizeAllowedOrigin(line, index + 1);

    if (!normalizedOrigin || seenOrigins.has(normalizedOrigin)) {
      return;
    }

    seenOrigins.add(normalizedOrigin);
    normalizedOrigins.push(normalizedOrigin);
  });

  return normalizedOrigins;
}

function buildEmbedInstructions(siteKey: string, allowedOrigins: string[]) {
  const resolvedSiteKey = siteKey || "YOUR_SITE_KEY";
  const exampleOrigin = allowedOrigins[0] || "https://yourwebsite.com";

  return [
    "Website lead capture setup",
    "",
    "1. Add this public site key to your website form.",
    `   ${resolvedSiteKey}`,
    "",
    "2. Allow the exact website origin that will submit the form.",
    `   Example allowed origin: ${exampleOrigin}`,
    "",
    "3. Submit leads to your backend capture endpoint.",
    "   POST /api/leads/capture",
    "",
    "4. Include JSON fields like this:",
    `   { "siteKey": "${resolvedSiteKey}", "name": "Lead Name", "phone": "+14155550123", "email": "lead@example.com", "message": "I'm interested" }`,
    "",
    "The site key is public. Security comes from matching it with your allowed website origins.",
    "If you regenerate the key here, update your website integration immediately.",
  ].join("\n");
}

function formatWebsiteKnowledgeTimestamp(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString();
}

function SetupHelperCard({
  title,
  children,
  icon,
}: {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-border/70 bg-secondary/20 p-4">
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div> : null}
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <div className="text-sm leading-6 text-muted-foreground">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data, saveSettings } = useAppData();
  const [businessName, setBusinessName] = useState(data.settings.businessName);
  const [businessType, setBusinessType] = useState(data.settings.businessType);
  const [whatsappNumber, setWhatsappNumber] = useState(data.settings.whatsappNumber);
  const [websiteUrl, setWebsiteUrl] = useState(data.settings.websiteUrl);
  const [websiteKnowledgeText, setWebsiteKnowledgeText] = useState(data.settings.websiteKnowledgeText);
  const [websiteKnowledgeUpdatedAt, setWebsiteKnowledgeUpdatedAt] = useState(data.settings.websiteKnowledgeUpdatedAt);
  const [websiteKnowledgeError, setWebsiteKnowledgeError] = useState(data.settings.websiteKnowledgeError);
  const [publicCaptureEnabled, setPublicCaptureEnabled] = useState(data.settings.publicCaptureEnabled);
  const [publicCaptureSiteKey, setPublicCaptureSiteKey] = useState(data.settings.publicCaptureSiteKey);
  const [publicCaptureAllowedOriginsText, setPublicCaptureAllowedOriginsText] = useState(
    data.settings.publicCaptureAllowedOrigins.join("\n"),
  );
  const [tone, setTone] = useState(data.settings.tone);
  const [businessDescription, setBusinessDescription] = useState(data.settings.businessDescription);
  const [servicesOffered, setServicesOffered] = useState(data.settings.servicesOffered);
  const [pricingInfo, setPricingInfo] = useState(data.settings.pricingInfo);
  const [targetCustomers, setTargetCustomers] = useState(data.settings.targetCustomers);
  const [primaryCTA, setPrimaryCTA] = useState(data.settings.primaryCTA);
  const [commonObjections, setCommonObjections] = useState(data.settings.commonObjections);
  const [customInstructions, setCustomInstructions] = useState(data.settings.customInstructions);
  const [faqs, setFaqs] = useState<FaqItem[]>(
    data.settings.faqs.length > 0 ? data.settings.faqs : [{ id: 1, question: "", answer: "" }],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingWebsiteKnowledge, setIsRefreshingWebsiteKnowledge] = useState(false);
  const [pendingSiteKeyAction, setPendingSiteKeyAction] = useState<PublicCaptureSiteKeyAction | null>(null);
  const [publicCaptureError, setPublicCaptureError] = useState<string | null>(null);

  const applySettingsToState = useCallback((settings: Partial<Settings>) => {
    setBusinessName(settings.businessName ?? data.settings.businessName);
    setBusinessType(settings.businessType || data.settings.businessType);
    setWhatsappNumber(settings.whatsappNumber || data.settings.whatsappNumber);
    setWebsiteUrl(settings.websiteUrl || data.settings.websiteUrl);
    setWebsiteKnowledgeText(settings.websiteKnowledgeText || "");
    setWebsiteKnowledgeUpdatedAt(settings.websiteKnowledgeUpdatedAt || null);
    setWebsiteKnowledgeError(settings.websiteKnowledgeError || "");
    setPublicCaptureEnabled(settings.publicCaptureEnabled ?? data.settings.publicCaptureEnabled);
    setPublicCaptureSiteKey(settings.publicCaptureSiteKey || data.settings.publicCaptureSiteKey);
    setPublicCaptureAllowedOriginsText(
      Array.isArray(settings.publicCaptureAllowedOrigins)
        ? settings.publicCaptureAllowedOrigins.join("\n")
        : data.settings.publicCaptureAllowedOrigins.join("\n"),
    );
    setTone(settings.tone || data.settings.tone);
    setBusinessDescription(settings.businessDescription || "");
    setServicesOffered(settings.servicesOffered || "");
    setPricingInfo(settings.pricingInfo || "");
    setTargetCustomers(settings.targetCustomers || "");
    setPrimaryCTA(settings.primaryCTA || "");
    setCommonObjections(settings.commonObjections || "");
    setCustomInstructions(settings.customInstructions || "");
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
  }, [
    data.settings.businessName,
    data.settings.businessType,
    data.settings.faqs,
    data.settings.publicCaptureAllowedOrigins,
    data.settings.publicCaptureEnabled,
    data.settings.publicCaptureSiteKey,
    data.settings.tone,
    data.settings.websiteUrl,
    data.settings.whatsappNumber,
  ]);

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
          applySettingsToState(settings);
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
  }, [
    applySettingsToState,
    data.settings.businessType,
    data.settings.faqs,
    data.settings.publicCaptureAllowedOrigins,
    data.settings.publicCaptureEnabled,
    data.settings.publicCaptureSiteKey,
    data.settings.websiteKnowledgeError,
    data.settings.websiteKnowledgeText,
    data.settings.websiteKnowledgeUpdatedAt,
    data.settings.websiteUrl,
    data.settings.businessName,
    data.settings.tone,
    data.settings.whatsappNumber,
  ]);

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

  const persistSettings = async (options?: {
    publicCaptureSiteKeyAction?: PublicCaptureSiteKeyAction;
    successMessage?: string;
  }) => {
    let normalizedAllowedOrigins: string[];

    try {
      normalizedAllowedOrigins = normalizeAllowedOriginsInput(publicCaptureAllowedOriginsText);
      setPublicCaptureError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Allowed origins must contain valid website origins.";
      setPublicCaptureError(message);
      toast.error(message);
      return;
    }

    const nextSettings: SettingsUpdatePayload = {
      ...data.settings,
      businessName: businessName.trim(),
      businessType,
      whatsappNumber,
      websiteUrl: websiteUrl.trim(),
      websiteKnowledgeText,
      websiteKnowledgeUpdatedAt,
      websiteKnowledgeError,
      publicCaptureEnabled,
      publicCaptureSiteKey,
      publicCaptureAllowedOrigins: normalizedAllowedOrigins,
      tone,
      businessDescription: businessDescription.trim(),
      servicesOffered: servicesOffered.trim(),
      pricingInfo: pricingInfo.trim(),
      targetCustomers: targetCustomers.trim(),
      primaryCTA: primaryCTA.trim(),
      commonObjections: commonObjections.trim(),
      customInstructions: customInstructions.trim(),
      faqs: faqs
        .map((faq, index) => ({
          id: index + 1,
          question: faq.question.trim(),
          answer: faq.answer.trim(),
        }))
        .filter((faq) => faq.question || faq.answer),
    };

    if (options?.publicCaptureSiteKeyAction) {
      nextSettings.publicCaptureSiteKeyAction = options.publicCaptureSiteKeyAction;
    }

    setIsSaving(true);
    setPendingSiteKeyAction(options?.publicCaptureSiteKeyAction ?? null);

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

      const savedSettings = payload.data?.settings;

      if (!savedSettings) {
        throw new Error("Settings save completed but no settings payload was returned.");
      }

      const mergedSettings = {
        ...data.settings,
        ...savedSettings,
      } as Settings;

      saveSettings(mergedSettings);
      applySettingsToState(mergedSettings);

      toast.success(options?.successMessage || "Settings saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save settings.");
    } finally {
      setIsSaving(false);
      setPendingSiteKeyAction(null);
    }
  };

  const handleSave = async () => {
    await persistSettings({ successMessage: "Settings saved." });
  };

  const handleRefreshWebsiteKnowledge = async () => {
    setIsRefreshingWebsiteKnowledge(true);

    try {
      const response = await apiFetch("/api/settings/website-knowledge/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          websiteUrl: websiteUrl.trim(),
        }),
      });
      const payload = await parseApiJson<SettingsApiResponse>(response);

      if (!response.ok) {
        throw new Error(payload.message || "Unable to refresh website knowledge.");
      }

      const savedSettings = payload.data?.settings;

      if (!savedSettings) {
        throw new Error("Website knowledge refresh completed but no settings payload was returned.");
      }

      const mergedSettings = {
        ...data.settings,
        ...savedSettings,
      } as Settings;

      saveSettings(mergedSettings);
      applySettingsToState(mergedSettings);
      toast.success("Website knowledge refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to refresh website knowledge.");
    } finally {
      setIsRefreshingWebsiteKnowledge(false);
    }
  };

  const handleCopy = async (value: string, successMessage: string) => {
    if (!value.trim()) {
      toast.error("Nothing to copy yet.");
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error("Unable to copy to clipboard.");
    }
  };

  let embedInstructionOrigins: string[] = [];

  try {
    embedInstructionOrigins = normalizeAllowedOriginsInput(publicCaptureAllowedOriginsText);
  } catch {
    embedInstructionOrigins = [];
  }

  const embedInstructions = buildEmbedInstructions(publicCaptureSiteKey, embedInstructionOrigins);
  const formattedWebsiteKnowledgeUpdatedAt = formatWebsiteKnowledgeTimestamp(websiteKnowledgeUpdatedAt);

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
          id="business-profile"
          className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-6 shadow-[0_18px_50px_hsl(222_47%_3%/0.35)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Business Profile</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Start with the basics. These details help organize your account and keep setup steps clear.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <SetupHelperCard title="What to enter" icon={<BookOpen className="h-4 w-4" />}>
              Use the business name your customers recognize, then choose the closest business type. AI-specific service and sales details live in the next section.
            </SetupHelperCard>
            <div className="hidden md:block" />

            <div className="space-y-2">
              <Label htmlFor="business-name">Business name</Label>
              <Input
                id="business-name"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder="Jafware"
                disabled={isLoading || isSaving}
              />
            </div>

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
          id="whatsapp"
          className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_30%_8%))] p-6 shadow-[0_18px_50px_hsl(222_45%_4%/0.32)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">WhatsApp Connection</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Tell JafLeadX which WhatsApp sender is connected through Twilio for inbound and outbound lead conversations.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <SetupHelperCard title="Current MVP routing" icon={<MessageCircle className="h-4 w-4" />}>
              The saved number should match the configured Twilio WhatsApp sender. Client-owned WhatsApp onboarding is not automated yet.
            </SetupHelperCard>

            <div className="space-y-2">
              <Label htmlFor="whatsapp-number">Twilio WhatsApp sender</Label>
              <Input
                id="whatsapp-number"
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
                placeholder="+14155238886"
                disabled={isLoading || isSaving}
              />
              <p className="text-xs leading-6 text-muted-foreground">
                Use E.164 format, for example <span className="font-mono">+14155238886</span>.
              </p>
            </div>
          </div>
        </section>

        <section
          id="ai-business-profile"
          className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_28%_9%))] p-6 shadow-[0_18px_50px_hsl(222_40%_4%/0.32)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">AI Business Profile</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                This gives your WhatsApp AI better sales context so it can answer service, pricing, and business-fit questions more naturally.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <SetupHelperCard title="How the AI uses this" icon={<Bot className="h-4 w-4" />}>
              Write this like a sales briefing for your assistant. Services should be customer-facing, pricing should be clear, and the primary CTA should be direct.
            </SetupHelperCard>
            <SetupHelperCard title="Internal guidance only" icon={<Shield className="h-4 w-4" />}>
              Custom instructions guide behavior behind the scenes. They are not shown to leads as scripted customer-facing copy.
            </SetupHelperCard>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="business-description">What does your business do?</Label>
              <Textarea
                id="business-description"
                rows={4}
                value={businessDescription}
                onChange={(event) => setBusinessDescription(event.target.value)}
                placeholder="Describe what your business does in plain language."
                disabled={isLoading || isSaving}
                className="rounded-2xl"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="services-offered">Services/products offered</Label>
              <Textarea
                id="services-offered"
                rows={4}
                value={servicesOffered}
                onChange={(event) => setServicesOffered(event.target.value)}
                placeholder="List your main services, products, or outcomes the AI should mention."
                disabled={isLoading || isSaving}
                className="rounded-2xl"
              />
              <p className="text-xs leading-6 text-muted-foreground">
                Use customer-facing service names, not internal package codes.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricing-info">Pricing information</Label>
              <Textarea
                id="pricing-info"
                rows={4}
                value={pricingInfo}
                onChange={(event) => setPricingInfo(event.target.value)}
                placeholder="Add pricing guidance, plan notes, or how the AI should answer pricing questions."
                disabled={isLoading || isSaving}
                className="rounded-2xl"
              />
              <p className="text-xs leading-6 text-muted-foreground">
                Give enough guidance for pricing questions, including when the AI should suggest a consultation instead.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-customers">Ideal customers</Label>
              <Textarea
                id="target-customers"
                rows={4}
                value={targetCustomers}
                onChange={(event) => setTargetCustomers(event.target.value)}
                placeholder="Who is this best for? Industry, business type, or use case."
                disabled={isLoading || isSaving}
                className="rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary-cta">Main call-to-action</Label>
              <Input
                id="primary-cta"
                value={primaryCTA}
                onChange={(event) => setPrimaryCTA(event.target.value)}
                placeholder="Book a demo, request a quote, schedule a consultation"
                disabled={isLoading || isSaving}
              />
              <p className="text-xs leading-6 text-muted-foreground">
                Keep this direct, for example <span className="font-medium text-foreground">Offer a demo</span>.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="custom-instructions">Extra AI instructions</Label>
              <Textarea
                id="custom-instructions"
                value={customInstructions}
                onChange={(event) => setCustomInstructions(event.target.value)}
                placeholder="Any extra guidance for tone, positioning, or sales behavior"
                disabled={isLoading || isSaving}
                rows={3}
                className="rounded-2xl"
              />
              <p className="text-xs leading-6 text-muted-foreground">
                Internal guidance only. Avoid writing exact customer-facing scripts here.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="common-objections">Common objections / answers</Label>
              <Textarea
                id="common-objections"
                rows={4}
                value={commonObjections}
                onChange={(event) => setCommonObjections(event.target.value)}
                placeholder="Example: Setup takes too long — explain onboarding is quick and guided."
                disabled={isLoading || isSaving}
                className="rounded-2xl"
              />
            </div>
          </div>
        </section>

        <section
          id="website-knowledge"
          className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(210_32%_9%))] p-6 shadow-[0_18px_50px_hsl(210_40%_4%/0.32)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Website Knowledge</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Save your website URL and refresh a text snapshot the AI can use when answering lead questions.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <SetupHelperCard title="What this does" icon={<Globe className="h-4 w-4" />}>
              Refreshing website knowledge imports a text snapshot from your site. The AI uses this content as context when answering lead questions.
            </SetupHelperCard>

            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="website-url">Website URL</Label>
                <Input
                  id="website-url"
                  type="url"
                  value={websiteUrl}
                  onChange={(event) => setWebsiteUrl(event.target.value)}
                  placeholder="https://yourwebsite.com"
                  disabled={isLoading || isSaving || isRefreshingWebsiteKnowledge}
                />
                <p className="text-sm leading-6 text-muted-foreground">
                  Use your main public website URL. The refresh action imports a safe text snapshot from that page only.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading || isSaving || isRefreshingWebsiteKnowledge || !websiteUrl.trim()}
                onClick={() => void handleRefreshWebsiteKnowledge()}
                className="h-11 w-full rounded-2xl px-4 md:w-auto"
              >
                {isRefreshingWebsiteKnowledge ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {isRefreshingWebsiteKnowledge ? "Refreshing..." : "Refresh Knowledge"}
              </Button>
            </div>

            {websiteKnowledgeError ? (
              <Alert variant="destructive">
                <AlertTitle>Website knowledge refresh failed</AlertTitle>
                <AlertDescription>{websiteKnowledgeError}</AlertDescription>
              </Alert>
            ) : null}

            {formattedWebsiteKnowledgeUpdatedAt ? (
              <div className="rounded-[24px] border border-border/70 bg-secondary/20 px-5 py-4">
                <p className="text-sm font-medium text-foreground">Last refreshed</p>
                <p className="mt-1 text-sm text-muted-foreground">{formattedWebsiteKnowledgeUpdatedAt}</p>
              </div>
            ) : null}

            <div className="rounded-[24px] border border-border/70 bg-black/20 p-5">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Knowledge preview</p>
                  <p className="text-sm text-muted-foreground">
                    This is the extracted website text currently available to the AI.
                  </p>
                </div>
                {websiteKnowledgeText ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading || isSaving || isRefreshingWebsiteKnowledge}
                    onClick={() => void handleCopy(websiteKnowledgeText, "Website knowledge copied.")}
                    className="h-10 rounded-2xl px-4"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Preview
                  </Button>
                ) : null}
              </div>
              <Textarea
                value={websiteKnowledgeText || "No website knowledge has been imported yet."}
                readOnly
                rows={10}
                className="rounded-2xl border-border/70 bg-secondary/20 text-xs leading-6 [overflow-wrap:anywhere]"
              />
            </div>
          </div>
        </section>

        <section
          id="website-capture"
          className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(210_40%_9%))] p-6 shadow-[0_18px_50px_hsl(210_45%_4%/0.35)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">
                Website Lead Capture
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Manage the public site key and origin allowlist used by your website lead capture integration.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <SetupHelperCard title="Allowed origins protect capture" icon={<Shield className="h-4 w-4" />}>
                Add the exact domain that hosts your lead form, such as <span className="font-mono text-foreground">https://yourdomain.com</span>. Do not include paths.
              </SetupHelperCard>
              <SetupHelperCard title="Site key is public" icon={<KeyRound className="h-4 w-4" />}>
                This key is safe to place in website code, but it only works when requests come from an allowed origin.
              </SetupHelperCard>
            </div>

            <div className="flex flex-col gap-4 rounded-[24px] border border-border/70 bg-secondary/20 p-5 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <Label htmlFor="public-capture-enabled" className="text-sm font-medium text-foreground">
                  Enable public capture
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow website forms to send public lead capture requests with your site key.
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Current state:{" "}
                  <span className={publicCaptureEnabled ? "text-success" : "text-amber-300"}>
                    {publicCaptureEnabled ? "Enabled" : "Disabled"}
                  </span>
                </p>
              </div>
              <Switch
                id="public-capture-enabled"
                checked={publicCaptureEnabled}
                disabled={isLoading || isSaving}
                onCheckedChange={setPublicCaptureEnabled}
              />
            </div>

            {publicCaptureEnabled && !publicCaptureSiteKey ? (
              <Alert className="border-amber-500/30 bg-amber-500/10">
                <Shield className="h-4 w-4" />
                <AlertTitle>Generate a site key before going live</AlertTitle>
                <AlertDescription>
                  Public capture is enabled, but your website cannot submit leads until you generate a site key.
                </AlertDescription>
              </Alert>
            ) : null}

            {publicCaptureError ? (
              <Alert variant="destructive">
                <AlertTitle>Allowed origins need attention</AlertTitle>
                <AlertDescription>{publicCaptureError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="public-capture-site-key">Public site key</Label>
                <Input
                  id="public-capture-site-key"
                  value={publicCaptureSiteKey}
                  readOnly
                  disabled={isLoading}
                  placeholder="No site key generated yet"
                  className="truncate font-mono text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading || isSaving || !publicCaptureSiteKey}
                  onClick={() => void handleCopy(publicCaptureSiteKey, "Site key copied.")}
                  className="h-11 rounded-2xl px-4"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Key
                </Button>
                {!publicCaptureSiteKey ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLoading || isSaving}
                    onClick={() =>
                      void persistSettings({
                        publicCaptureSiteKeyAction: "generate",
                        successMessage: "Public site key generated.",
                      })
                    }
                    className="h-11 rounded-2xl px-4"
                  >
                    {pendingSiteKeyAction === "generate" && isSaving ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Generate Key
                  </Button>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="outline" disabled={isLoading || isSaving} className="h-11 rounded-2xl px-4">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Regenerate Key
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Regenerate public site key?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your current website integration will stop working until it is updated with the new key.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            void persistSettings({
                              publicCaptureSiteKeyAction: "regenerate",
                              successMessage: "Public site key regenerated.",
                            })
                          }
                        >
                          Replace key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="public-capture-origins">Allowed origins</Label>
              <Textarea
                id="public-capture-origins"
                rows={5}
                value={publicCaptureAllowedOriginsText}
                disabled={isLoading || isSaving}
                onChange={(event) => {
                  setPublicCaptureAllowedOriginsText(event.target.value);
                  if (publicCaptureError) {
                    setPublicCaptureError(null);
                  }
                }}
                placeholder={"https://jafware.com\nhttps://clientsite.com"}
                className="rounded-2xl font-mono text-sm"
              />
              <p className="text-sm leading-6 text-muted-foreground">
                Enter one full origin per line. Use the origin only, such as <span className="font-mono">https://yourdomain.com</span>.
              </p>
            </div>

            <div className="rounded-[24px] border border-border/70 bg-black/20 p-5">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Embed instructions</p>
                  <p className="text-sm text-muted-foreground">
                    Share this with whoever is wiring the public website form.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading || isSaving}
                  onClick={() => void handleCopy(embedInstructions, "Embed instructions copied.")}
                  className="h-10 rounded-2xl px-4"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Instructions
                </Button>
              </div>
              <Textarea
                value={embedInstructions}
                readOnly
                rows={10}
                className="rounded-2xl border-border/70 bg-secondary/20 font-mono text-xs leading-6 [overflow-wrap:anywhere]"
              />
            </div>
          </div>
        </section>

        <section
          id="faqs"
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
            <Button type="button" variant="outline" onClick={addFaq} className="h-11 w-full rounded-2xl px-4 sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add FAQ
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            <SetupHelperCard title="Good FAQ answers are reusable" icon={<BookOpen className="h-4 w-4" />}>
              Add answers for common pricing, setup, eligibility, support, or objection questions. Keep them concise and factual.
            </SetupHelperCard>

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

        <section
          id="automation"
          className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_32%_8%))] p-6 shadow-[0_18px_50px_hsl(222_45%_4%/0.28)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Follow-up / Automation</h2>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                  Follow-up timing and automation controls are managed separately so account setup stays clean.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" className="h-11 w-full rounded-2xl px-4 sm:w-auto">
              <Link to="/automation">Open Automation</Link>
            </Button>
          </div>
        </section>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving || isLoading} className="h-11 w-full rounded-2xl px-5 sm:w-auto">
            {isLoading ? "Loading..." : isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
