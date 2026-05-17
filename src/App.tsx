import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AppDataProvider } from "@/context/AppDataContext";
import { BillingProvider } from "@/context/BillingContext";
import { AuthenticatedRoute, ProtectedRoute, PublicOnlyRoute } from "@/components/ProtectedRoute";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Signup = lazy(() => import("./pages/Signup"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leads = lazy(() => import("./pages/Leads"));
const Conversations = lazy(() => import("./pages/Conversations"));
const Automation = lazy(() => import("./pages/Automation"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Bookings = lazy(() => import("./pages/Bookings"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Account = lazy(() => import("./pages/Account"));
const Admin = lazy(() => import("./pages/Admin"));
const Pricing = lazy(() => import("./pages/Pricing"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="rounded-xl border border-border bg-card px-6 py-4 text-sm text-muted-foreground" style={{ boxShadow: "var(--shadow-card)" }}>
        Loading app...
      </div>
    </div>
  );
}

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { hydrate } = useAuth();
  useEffect(() => {
    void hydrate().catch(() => {
      // Protected routes will redirect if session restoration fails.
    });
  }, [hydrate]);

  return children;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthBootstrap>
          <BillingProvider>
            <AppDataProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <Suspense fallback={<RouteFallback />}>{children}</Suspense>
              </TooltipProvider>
            </AppDataProvider>
          </BillingProvider>
        </AuthBootstrap>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/auth" element={<Auth />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>
      <Route element={<AuthenticatedRoute />}>
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/account" element={<Account />} />
        <Route path="/profile" element={<Account />} />
      </Route>
      <Route element={<AuthenticatedRoute />}>
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/automation" element={<Automation />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <AppProviders>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />
    </BrowserRouter>
  </AppProviders>
);

export default App;
