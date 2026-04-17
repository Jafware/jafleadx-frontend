import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBilling } from "@/context/BillingContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { loadRazorpayCheckout } from "@/lib/razorpay";

export default function Pricing() {
  const { currentPlan, plans, refreshSubscription, startSubscriptionCheckout, subscription, isLoading } = useBilling();
  const navigate = useNavigate();

  const handleSubscribe = async (planId: (typeof plans)[number]["id"]) => {
    try {
      const { customer, keyId, shortUrl, subscriptionId } = await startSubscriptionCheckout(planId);

      if (keyId && subscriptionId) {
        const Razorpay = await loadRazorpayCheckout();
        const checkout = new Razorpay({
          key: keyId,
          subscription_id: subscriptionId,
          name: "JafLeadX AI",
          description: `Subscribe to the ${plans.find((plan) => plan.id === planId)?.name || "selected"} plan`,
          prefill: customer,
          theme: {
            color: "#0f766e",
          },
          handler: () => {
            void (async () => {
              try {
                await refreshSubscription();
                toast.success("Payment successful. Redirecting to your dashboard.");
                navigate("/dashboard", { replace: true });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Payment succeeded, but we could not refresh your subscription yet.");
                navigate("/dashboard", { replace: true });
              }
            })();
          },
          modal: {
            ondismiss: () => {
              toast.message("Checkout closed before payment completed.");
            },
          },
        });

        checkout.open();
        return;
      }

      if (shortUrl) {
        window.location.assign(shortUrl);
        return;
      }

      throw new Error("Missing Razorpay checkout details.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start subscription checkout.");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="text-center max-w-xl mx-auto">
          <h1 className="text-3xl font-display font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-2">Scale your lead conversion with the right plan for your business</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Current subscription: <span className="font-medium text-foreground">{currentPlan.name}</span> • {subscription.status}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "rounded-xl border bg-card p-6 flex flex-col relative",
                plan.popular
                  ? "border-primary shadow-[var(--shadow-glow)]"
                  : "border-border"
              )}
              style={{ boxShadow: plan.popular ? undefined : "var(--shadow-card)" }}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  Most Popular
                </span>
              )}
              <h3 className="font-display font-bold text-foreground text-lg">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              <div className="mt-4 mb-6">
                <span className="font-display text-4xl font-bold text-foreground">${plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.periodLabel}</span>
              </div>
              <ul className="space-y-2.5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-secondary-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6 w-full"
                variant={plan.popular ? "default" : "outline"}
                disabled={isLoading || currentPlan.id === plan.id}
                onClick={() => void handleSubscribe(plan.id)}
              >
                {currentPlan.id === plan.id ? "Current Plan" : isLoading ? "Opening Checkout..." : "Subscribe Monthly"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
