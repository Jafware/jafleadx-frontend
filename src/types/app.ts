export type EntityId = string | number;

export type LeadStatus = "New" | "Qualified" | "Follow-up" | "Converted";

export interface User {
  id: string;
  fullName: string;
  email: string;
}

export type SubscriptionPlan = "starter" | "growth" | "pro";
export type SubscriptionStatus = "inactive" | "pending" | "active" | "cancelled" | "expired";
export type FeatureKey =
  | "followUpAutomation"
  | "bookings"
  | "advancedAnalytics"
  | "apiAccess"
  | "aiDrafts";

export interface BillingSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingInterval: "monthly";
  razorpaySubscriptionId?: string;
  razorpayPlanId?: string;
  razorpayKeyId?: string;
  shortUrl?: string;
  currentStart?: string;
  currentEnd?: string;
  updatedAt: string;
}

export interface Lead {
  id: EntityId;
  name: string;
  phone: string;
  email?: string | null;
  source: string;
  status: LeadStatus;
  notes?: string | null;
  createdAt: string;
  lastContactAt: string;
}

export interface ConversationMessage {
  id: EntityId;
  from: "lead" | "ai" | "agent";
  text: string;
  time: string;
  isAi?: boolean;
  status?: "sending" | "sent" | "delivered" | "read";
  kind?: "message" | "follow-up";
  createdAt?: string;
}

export interface ConversationFollowUpState {
  awaitingReplySince: string | null;
  sentStepIds: number[];
}

export interface Conversation {
  id: EntityId;
  leadId: EntityId;
  name: string;
  channel: string;
  status: "Active" | "Pending reply" | "Closed";
  mode?: "ai" | "manual";
  unread: boolean;
  time: string;
  lastMsg: string;
  messages: ConversationMessage[];
  followUpState?: ConversationFollowUpState;
}

export interface Booking {
  id: EntityId;
  leadId: EntityId;
  name: string;
  date: string;
  time: string;
  type: string;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

export interface FollowUpStep {
  id: number;
  delayHours: number;
  label: string;
  message: string;
}

export interface Settings {
  businessName: string;
  businessType: string;
  whatsappNumber: string;
  publicCaptureEnabled: boolean;
  publicCaptureSiteKey: string;
  publicCaptureAllowedOrigins: string[];
  tone: string;
  businessDescription: string;
  automationEnabled: boolean;
  faqs: FaqItem[];
  followUps: FollowUpStep[];
}

export interface AppData {
  leads: Lead[];
  conversations: Conversation[];
  bookings: Booking[];
  settings: Settings;
}
