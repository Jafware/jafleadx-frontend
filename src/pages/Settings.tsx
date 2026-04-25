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
import { BrainCircuit, Copy, Globe, Plus, RefreshCw, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
    "1. Include your siteKey in public lead capture requests from your website.",
    `   siteKey: "${resolvedSiteKey}"`,
    "",
    "2. Send requests only from an allowed origin listed in this settings section.",
    `   Example allowed origin: ${exampleOrigin}`,
    "",
    "3. If you regenerate the key here, update your website integration immediately.",
  ].join("\n");
}

export default function SettingsPage() {
  const { data, saveSettings } = useAppData();
  const [businessType, setBusinessType] = useState(data.settings.businessType);
  const [whatsappNumber, setWhatsappNumber] = useState(data.settings.whatsappNumber);
  const [publicCaptureEnabled, setPublicCaptureEnabled] = useState(data.settings.publicCaptureEnabled);
  const [publicCaptureSiteKey, setPublicCaptureSiteKey] = useState(data.settings.publicCaptureSiteKey);
  const [publicCaptureAllowedOriginsText, setPublicCaptureAllowedOriginsText] = useState(
    data.settings.publicCaptureAllowedOrigins.join("\n"),
  );
  const [tone, setTone] = useState(data.settings.tone);
  const [faqs, setFaqs] = useState<FaqItem[]>(
    data.settings.faqs.length > 0 ? data.settings.faqs : [{ id: 1, question: "", answer: "" }],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingSiteKeyAction, setPendingSiteKeyAction] = useState<PublicCaptureSiteKeyAction | null>(null);
  const [publicCaptureError, setPublicCaptureError] = useState<string | null>(null);

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
          setPublicCaptureEnabled(settings.publicCaptureEnabled ?? data.settings.publicCaptureEnabled);
          setPublicCaptureSiteKey(settings.publicCaptureSiteKey || data.settings.publicCaptureSiteKey);
          setPublicCaptureAllowedOriginsText(
            Array.isArray(settings.publicCaptureAllowedOrigins)
              ? settings.publicCaptureAllowedOrigins.join("\n")
              : data.settings.publicCaptureAllowedOrigins.join("\n"),
          );
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
  }, [
    data.settings.businessType,
    data.settings.faqs,
    data.settings.publicCaptureAllowedOrigins,
    data.settings.publicCaptureEnabled,
    data.settings.publicCaptureSiteKey,
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
      businessType,
      whatsappNumber,
      publicCaptureEnabled,
      publicCaptureSiteKey,
      publicCaptureAllowedOrigins: normalizedAllowedOrigins,
      tone,
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
      setPublicCaptureEnabled(mergedSettings.publicCaptureEnabled ?? false);
      setPublicCaptureSiteKey(mergedSettings.publicCaptureSiteKey || "");
      setPublicCaptureAllowedOriginsText(
        Array.isArray(mergedSettings.publicCaptureAllowedOrigins)
          ? mergedSettings.publicCaptureAllowedOrigins.join("\n")
          : "",
      );

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
              <p className="text-xs leading-6 text-muted-foreground">
                Use the same Twilio WhatsApp sender number that receives inbound messages. Example: `+919999999999`
              </p>
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
            <div className="flex flex-col gap-4 rounded-[24px] border border-border/70 bg-secondary/20 p-5 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <Label htmlFor="public-capture-enabled" className="text-sm font-medium text-foreground">
                  Enable public capture
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow website forms to send public lead capture requests with your site key.
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
                  className="font-mono text-sm"
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
                Enter one full origin per line. Use the origin only, such as <span className="font-mono">https://example.com</span>.
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
                rows={8}
                className="rounded-2xl border-border/70 bg-secondary/20 font-mono text-xs leading-6"
              />
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
