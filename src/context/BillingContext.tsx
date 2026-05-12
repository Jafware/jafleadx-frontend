import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, parseApiJson } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import { DEFAULT_SUBSCRIPTION, getPlanDefinition, hasFeatureAccess, PLAN_DEFINITIONS } from "@/lib/plans";
import type { BillingSubscription, FeatureKey, SubscriptionPlan } from "@/types/app";

interface BillingContextValue {
  subscription: BillingSubscription;
  isLoading: boolean;
  hasLoadedSubscription: boolean;
  plans: typeof PLAN_DEFINITIONS;
  currentPlan: ReturnType<typeof getPlanDefinition>;
  hasFeature: (feature: FeatureKey) => boolean;
  canAddLead: (leadCount: number) => boolean;
  refreshSubscription: () => Promise<void>;
  startSubscriptionCheckout: (plan: SubscriptionPlan) => Promise<{
    shortUrl?: string;
    subscriptionId?: string;
    keyId?: string;
    customer?: {
      email: string;
      name: string;
    };
  }>;
}

const BillingContext = createContext<BillingContextValue | undefined>(undefined);

async function fetchSubscriptionStatus(email: string) {
  const response = await apiFetch(`/api/billing/me?email=${encodeURIComponent(email)}`);
  const payload = await parseApiJson<{
    data?: {
      plan?: BillingSubscription["plan"];
      status?: BillingSubscription["status"];
      currentPeriodStart?: string | null;
      currentPeriodEnd?: string | null;
      subscriptionId?: string | null;
    };
  }>(response);

  if (!response.ok || !payload.data?.plan || !payload.data?.status) {
    throw new Error("Unable to load billing status.");
  }

  return {
    plan: payload.data.plan,
    status: payload.data.status,
    billingInterval: "monthly" as const,
    razorpaySubscriptionId: payload.data.subscriptionId || undefined,
    currentStart: payload.data.currentPeriodStart || undefined,
    currentEnd: payload.data.currentPeriodEnd || undefined,
    updatedAt: new Date().toISOString(),
  };
}

export function BillingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<BillingSubscription>(DEFAULT_SUBSCRIPTION);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedSubscription, setHasLoadedSubscription] = useState(false);

  const persistSubscription = useCallback((nextSubscription: BillingSubscription) => {
    setSubscription(nextSubscription);
  }, []);

  useEffect(() => {
    if (!user?.email) {
      setSubscription(DEFAULT_SUBSCRIPTION);
      setHasLoadedSubscription(true);
    }
  }, [user?.email]);

  useEffect(() => {
    if (!user?.email) {
      return;
    }

    setHasLoadedSubscription(false);
    void (async () => {
      try {
        const nextSubscription = await fetchSubscriptionStatus(user.email);
        persistSubscription(nextSubscription);
      } catch {
        persistSubscription(DEFAULT_SUBSCRIPTION);
      } finally {
        setHasLoadedSubscription(true);
      }
    })();
  }, [persistSubscription, user?.email]);

  const value = useMemo<BillingContextValue>(() => {
    const currentPlan = getPlanDefinition(subscription.plan);
    const entitlementPlan = subscription.status === "active" ? currentPlan : getPlanDefinition("starter");

    return {
      subscription,
      isLoading,
      hasLoadedSubscription,
      plans: PLAN_DEFINITIONS,
      currentPlan,
      hasFeature(feature) {
        return subscription.status === "active" && hasFeatureAccess(subscription.plan, feature);
      },
      canAddLead(leadCount) {
        return entitlementPlan.leadLimit === null || leadCount < entitlementPlan.leadLimit;
      },
      async refreshSubscription() {
        if (!user?.email) {
          return;
        }

        setIsLoading(true);
        try {
          const nextSubscription = await fetchSubscriptionStatus(user.email);
          persistSubscription(nextSubscription);
        } finally {
          setIsLoading(false);
        }
      },
      async startSubscriptionCheckout(plan) {
        if (!user?.email || !user.fullName) {
          throw new Error("Please sign in before starting a subscription.");
        }

        setIsLoading(true);
        try {
          const response = await apiFetch("/api/billing/subscription", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              plan,
            }),
          });

          const payload = await parseApiJson<{
            data?: {
              keyId?: string;
              shortUrl?: string;
              subscriptionId?: string;
              customer?: {
                email: string;
                name: string;
              };
              user?: {
                subscription_plan?: BillingSubscription["plan"];
                subscription_status?: BillingSubscription["status"];
                billing_provider_subscription_id?: string | null;
                current_period_start?: string | null;
                current_period_end?: string | null;
              };
            };
            message?: string;
          }>(response);

          if (!response.ok || !payload.data?.user?.subscription_plan || !payload.data.user.subscription_status) {
            throw new Error(payload.message || "Unable to create Razorpay subscription.");
          }

          persistSubscription({
            plan: payload.data.user.subscription_plan,
            status: payload.data.user.subscription_status,
            billingInterval: "monthly",
            razorpayKeyId: payload.data.keyId,
            razorpaySubscriptionId: payload.data.user.billing_provider_subscription_id || payload.data.subscriptionId || undefined,
            shortUrl: payload.data.shortUrl,
            currentStart: payload.data.user.current_period_start || undefined,
            currentEnd: payload.data.user.current_period_end || undefined,
            updatedAt: new Date().toISOString(),
          });
          return {
            shortUrl: payload.data.shortUrl,
            subscriptionId: payload.data.subscriptionId,
            keyId: payload.data.keyId,
            customer: payload.data.customer,
          };
        } finally {
          setIsLoading(false);
        }
      },
    };
  }, [hasLoadedSubscription, isLoading, persistSubscription, subscription, user?.email, user?.fullName]);

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error("useBilling must be used inside BillingProvider");
  }

  return context;
}
