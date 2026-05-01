import { FormEvent, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import { Zap } from "lucide-react";
import { toast } from "sonner";

interface ResetPasswordResponse {
  message?: string;
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!token) {
      toast.error("This reset link is missing a token.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });
      const payload = await parseApiJson<ResetPasswordResponse>(response);

      if (!response.ok) {
        throw new Error(payload.message || "Unable to reset password.");
      }

      setIsComplete(true);
      toast.success(payload.message || "Password reset successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reset password.");
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
            Set a new password
          </h1>
          <p className="text-sm text-muted-foreground">Choose a new password for your JafLeadX AI account.</p>
        </div>

        {!token ? (
          <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm leading-6 text-foreground">
            This reset link is missing or invalid. Please request a new password reset link.
          </div>
        ) : isComplete ? (
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm leading-6 text-foreground">
            Your password has been reset. You can now sign in with your new password.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="space-y-2">
              <Label htmlFor="reset-password">New password</Label>
              <Input
                id="reset-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
                minLength={8}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">Confirm password</Label>
              <Input
                id="reset-confirm-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                placeholder="Re-enter new password"
                autoComplete="new-password"
                required
                minLength={8}
                className="h-12"
              />
            </div>
            <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
              {isSubmitting ? "Please wait..." : "Reset Password"}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/auth" className="font-medium text-primary hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
