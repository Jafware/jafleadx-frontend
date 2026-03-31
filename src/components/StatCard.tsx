import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon }: StatCardProps) {
  return (
    <div
      className="app-hover animate-fade-in rounded-[24px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-5 shadow-[0_18px_50px_hsl(222_47%_3%/0.35)]"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</span>
          <div className="font-display text-[30px] font-semibold leading-none tracking-[-0.03em] text-foreground">{value}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 shadow-[0_12px_24px_hsl(var(--primary)/0.15)]">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
      </div>
      {change && (
        <span
          className={cn(
            "inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-medium",
            changeType === "positive" && "text-success",
            changeType === "negative" && "text-destructive",
            changeType === "neutral" && "text-muted-foreground",
            changeType === "positive" && "border-success/20 bg-success/10",
            changeType === "negative" && "border-destructive/20 bg-destructive/10",
            changeType === "neutral" && "border-border/70 bg-secondary/40",
          )}
        >
          {change}
        </span>
      )}
    </div>
  );
}
