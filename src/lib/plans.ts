import type { BillingSubscription, FeatureKey, SubscriptionPlan } from "@/types/app";

export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  price: number;
  currency: string;
  periodLabel: string;
  description: string;
  leadLimit: number | null;
  features: string[];
  gatedFeatures: FeatureKey[];
  popular?: boolean;
}

export const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    currency: "USD",
    periodLabel: "/month",
    description: "Perfect for small businesses getting started",
    leadLimit: 100,
    features: ["Up to 100 leads/month", "AI auto-responses", "WhatsApp integration", "Basic analytics", "Email support"],
    gatedFeatures: [],
  },
  {
    id: "growth",
    name: "Growth",
    price: 79,
    currency: "USD",
    periodLabel: "/month",
    description: "For growing businesses that need more power",
    leadLimit: 500,
    features: ["Up to 500 leads/month", "Advanced AI conversations", "Follow-up automation", "Booking system", "Priority support", "Custom AI training"],
    gatedFeatures: ["followUpAutomation", "bookings", "aiDrafts"],
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 199,
    currency: "USD",
    periodLabel: "/month",
    description: "For enterprises and high-volume operations",
    leadLimit: null,
    features: ["Unlimited leads", "Multi-agent AI", "Advanced analytics", "API access", "Dedicated support", "Custom integrations", "White-label option"],
    gatedFeatures: ["followUpAutomation", "bookings", "aiDrafts", "advancedAnalytics", "apiAccess"],
  },
];

export const DEFAULT_SUBSCRIPTION: BillingSubscription = {
  plan: "starter",
  status: "inactive",
  billingInterval: "monthly",
  updatedAt: new Date().toISOString(),
};

export function getPlanDefinition(plan: SubscriptionPlan) {
  return PLAN_DEFINITIONS.find((item) => item.id === plan) ?? PLAN_DEFINITIONS[0];
}

export function hasFeatureAccess(plan: SubscriptionPlan, feature: FeatureKey) {
  return getPlanDefinition(plan).gatedFeatures.includes(feature);
}
