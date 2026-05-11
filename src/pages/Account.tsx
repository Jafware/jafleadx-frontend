import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Save, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useBilling } from "@/context/BillingContext";
import { apiFetch, parseApiJson } from "@/lib/api-client";

function formatStatus(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export default function Account() {
  const navigate = useNavigate();
  const { logout, updateProfile, user } = useAuth();
  const { currentPlan, subscription } = useBilling();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [isSaving, setIsSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const normalizedFullName = fullName.trim();
  const hasChanges = normalizedFullName !== (user?.fullName || "");

  useEffect(() => {
    setFullName(user?.fullName || "");
  }, [user?.fullName]);

  const accountStatus = useMemo(() => formatStatus(subscription.status), [subscription.status]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!normalizedFullName) {
      toast.error("Full name is required.");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(normalizedFullName);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/auth", { replace: true });
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentPassword || !newPassword) {
      toast.error("Current password and new password are required.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("New password confirmation does not match.");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from your current password.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await apiFetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const payload = await parseApiJson<{ message?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.message || "Unable to change password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success(payload.message || "Password changed successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3">
              <Button asChild variant="ghost" className="h-9 rounded-lg px-2 text-muted-foreground hover:text-foreground">
                <Link to="/dashboard">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card">
                <UserRound className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Account</h1>
                <p className="mt-1 text-sm text-muted-foreground">Manage your personal profile and session.</p>
              </div>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={handleLogout} className="rounded-lg">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <form onSubmit={handleSave} className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="border-b border-border pb-4">
              <h2 className="text-lg font-semibold text-foreground">Profile</h2>
              <p className="mt-1 text-sm text-muted-foreground">This is separate from your business and AI assistant settings.</p>
            </div>

            <div className="mt-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  maxLength={120}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email || ""} readOnly className="bg-muted/50 text-muted-foreground" />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Email changes are not available in this step.</p>
              <Button type="submit" disabled={isSaving || !hasChanges} className="rounded-lg">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save profile"}
              </Button>
            </div>
          </form>

          <form onSubmit={handleChangePassword} className="rounded-lg border border-border bg-card p-5 shadow-sm lg:col-start-1">
            <div className="border-b border-border pb-4">
              <h2 className="text-lg font-semibold text-foreground">Change password</h2>
              <p className="mt-1 text-sm text-muted-foreground">Update the password you use to sign in to this account.</p>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm new password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Your active session stays signed in after this update.</p>
              <Button type="submit" disabled={isChangingPassword} className="rounded-lg">
                <Save className="mr-2 h-4 w-4" />
                {isChangingPassword ? "Changing..." : "Change password"}
              </Button>
            </div>
          </form>

          <aside className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Account status</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="mt-1 font-medium text-foreground">{currentPlan.name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-1 font-medium text-foreground">{accountStatus}</dd>
              </div>
              {subscription.currentEnd ? (
                <div>
                  <dt className="text-muted-foreground">Current period ends</dt>
                  <dd className="mt-1 font-medium text-foreground">{new Date(subscription.currentEnd).toLocaleDateString()}</dd>
                </div>
              ) : null}
            </dl>
            <Button asChild variant="secondary" className="mt-6 w-full rounded-lg">
              <Link to="/settings">Business settings</Link>
            </Button>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
