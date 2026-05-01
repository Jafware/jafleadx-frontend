import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import { Zap } from "lucide-react";
import { toast } from "sonner";

interface ForgotPasswordResponse {
  message?: string;
  data?: {
    developmentOnly?: boolean;
    resetUrl?: string;
  };
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [developmentResetUrl, setDevelopmentResetUrl] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setDevelopmentResetUrl("");

    try {
      const response = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const payload = await parseApiJson<ForgotPasswordResponse>(response);

      if (!response.ok) {
        throw new Error(payload.message || "Unable to request password reset.");
      }

      const message = payload.message || "If an account exists for that email, password reset instructions will be sent.";
      setSuccessMessage(message);
      if (payload.data?.developmentOnly && payload.data.resetUrl) {
        setDevelopmentResetUrl(payload.data.resetUrl);
      }
      toast.success("Password reset request received.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to request password reset.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[100svh] justify-center overflow-y-auto bg-background px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:items-center sm:py-8">
      <div className="w-full max-w-sm space-y-5">
        <div className="space-y-2 text-center">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary animate-pulse-glow sm:h-12 sm:w-12">
            <Zap className="h-5 w-5 text-primary-foreground sm:h-6 sm:w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Reset your password
          </h1>
          <p className="text-sm text-muted-foreground">Enter your account email and we will send reset instructions.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="space-y-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="email"
              required
              className="h-12"
            />
          </div>
          <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : "Send Reset Link"}
          </Button>
        </form>

        {successMessage ? (
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm leading-6 text-foreground">
            {successMessage}
          </div>
        ) : null}

        {developmentResetUrl ? (
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-xs leading-6 text-amber-100">
            Development reset link:
            <br />
            <a href={developmentResetUrl} className="break-all font-medium underline">
              {developmentResetUrl}
            </a>
          </div>
        ) : null}

        <p className="text-center text-sm text-muted-foreground">
          Remembered it? <Link to="/auth" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
