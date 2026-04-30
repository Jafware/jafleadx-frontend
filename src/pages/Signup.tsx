import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await register(fullName, email, password);
      toast.success("Account created successfully.");
      navigate("/dashboard", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create account.");
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
            JafLeadX<span className="text-primary"> AI</span>
          </h1>
          <p className="text-sm text-muted-foreground">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="space-y-2">
            <Label htmlFor="signup-name">Name</Label>
            <Input
              id="signup-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="John Doe"
              autoComplete="name"
              required
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
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
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Enter a password"
              autoComplete="new-password"
              required
              className="h-12"
            />
          </div>
          <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : "Create Account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/auth" className="text-primary hover:underline font-medium">Sign in</Link>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          Powered by <span className="font-medium text-foreground">Jafware</span>
        </p>
      </div>
    </div>
  );
}
