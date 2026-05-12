import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useBilling } from "@/context/BillingContext";

function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="rounded-xl border border-border bg-card px-6 py-4 text-sm text-muted-foreground" style={{ boxShadow: "var(--shadow-card)" }}>
        Checking access...
      </div>
    </div>
  );
}

function hasCoreAppAccess(subscription: { plan: string; status: string }) {
  return subscription.plan === "starter" || subscription.status === "active" || subscription.status === "pending";
}

export function AuthenticatedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function ProtectedRoute() {
  const location = useLocation();
  const { subscription, hasLoadedSubscription } = useBilling();

  if (!hasLoadedSubscription) {
    return <RouteLoading />;
  }

  if (!hasCoreAppAccess(subscription)) {
    return <Navigate to="/pricing" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();
  const { subscription } = useBilling();

  if (isAuthenticated) {
    return <Navigate to={hasCoreAppAccess(subscription) ? "/dashboard" : "/pricing"} replace />;
  }

  return <Outlet />;
}
