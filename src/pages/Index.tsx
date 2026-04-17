import { Button } from "@/components/ui/button";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { Zap, ArrowRight, MessageSquare, Users, TrendingUp, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

const features = [
  { icon: MessageSquare, title: "AI WhatsApp Chat", desc: "Automatically respond to leads 24/7 with intelligent AI conversations" },
  { icon: Users, title: "Lead Management", desc: "Track, qualify, and manage all your leads in one central dashboard" },
  { icon: TrendingUp, title: "Smart Follow-ups", desc: "Automated follow-up sequences that convert leads into customers" },
  { icon: Calendar, title: "Booking System", desc: "Let leads schedule appointments directly through WhatsApp" },
];

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.09),transparent_32%),linear-gradient(180deg,hsl(224_37%_8%),hsl(222_40%_5%))] text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">
            JafLeadX<span className="text-primary"> AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate("/auth")}>Sign In</Button>
          <Button onClick={() => navigate("/auth")}>Get Started</Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pb-24 pt-14 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,470px)]">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-sm font-medium text-primary animate-fade-in">
              <Zap className="h-3.5 w-3.5" /> AI-Powered Lead Conversion
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight text-white animate-fade-in sm:text-5xl lg:text-6xl">
              Capture website leads
              <br />
              <span className="text-primary">and answer in seconds</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-white/68 animate-fade-in">
              Turn a simple inbound form into a live sales handoff. Every submission becomes a lead, opens a conversation, and can trigger an instant AI reply.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row animate-fade-in">
              <Button size="lg" onClick={() => navigate("/auth")} className="text-base">
                Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/dashboard")} className="border-white/10 bg-white/5 text-base text-white hover:bg-white/10">
                View Demo
              </Button>
            </div>
            <div className="mt-8 grid gap-3 text-sm text-white/65 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">Website form to CRM</div>
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">Conversation saved instantly</div>
              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">Optional AI auto-reply</div>
            </div>
          </div>

          <LeadCaptureForm className="animate-fade-in" />
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <h2 className="font-display text-2xl font-bold text-foreground text-center mb-12">
          Everything you need to convert leads
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border text-center">
        <p className="text-sm text-muted-foreground">
          © 2024 JafLeadX AI by <span className="font-medium text-foreground">Jafware</span>. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
