import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { dashboardSidebarMenuItems } from "@/design-system/sidebar-menu";

const dashboardButtonVariants = cva(
  "inline-flex items-center justify-center rounded-xl border text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-primary/20 bg-primary text-primary-foreground shadow-[0_10px_30px_hsl(var(--primary)/0.18)] hover:-translate-y-0.5 hover:bg-primary/90",
        secondary:
          "border-border bg-secondary/80 text-secondary-foreground hover:border-primary/20 hover:bg-secondary",
      },
      size: {
        sm: "h-9 px-3.5",
        md: "h-11 px-4.5",
        lg: "h-12 px-5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface DashboardButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof dashboardButtonVariants> {}

export function DashboardButton({ className, variant, size, ...props }: DashboardButtonProps) {
  return <button className={cn(dashboardButtonVariants({ variant, size, className }))} {...props} />;
}

export interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function DashboardCard({ className, title, description, action, children, ...props }: DashboardCardProps) {
  return (
    <section
      className={cn(
        "rounded-[22px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] p-6 shadow-[0_18px_50px_hsl(222_47%_3%/0.45)]",
        className,
      )}
      {...props}
    >
      {title || description || action ? (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            {title ? <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">{title}</h3> : null}
            {description ? <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export interface DashboardInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const DashboardInput = React.forwardRef<HTMLInputElement, DashboardInputProps>(
  ({ className, label, hint, error, ...props }, ref) => (
    <label className="block space-y-2.5">
      {label ? <span className="text-sm font-medium text-foreground">{label}</span> : null}
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-xl border border-border/80 bg-secondary/60 px-3.5 text-sm text-foreground placeholder:text-muted-foreground/80 shadow-inner transition-colors outline-none",
          "focus:border-primary/40 focus:bg-secondary focus:ring-2 focus:ring-primary/20",
          error && "border-destructive/60 focus:border-destructive/70 focus:ring-destructive/20",
          className,
        )}
        {...props}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </label>
  ),
);

DashboardInput.displayName = "DashboardInput";

export function DashboardContainer({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

export interface SidebarNavItem {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  badge?: string;
  href?: string;
}

interface SidebarPanelProps {
  brand: React.ReactNode;
  items: SidebarNavItem[];
  footer?: React.ReactNode;
  className?: string;
  onItemClick?: () => void;
}

function DashboardSidebarPanel({ brand, items, footer, className, onItemClick }: SidebarPanelProps) {
  return (
    <aside
      className={cn(
        "flex h-full w-[280px] flex-col rounded-none border-r border-border/80",
        "bg-[linear-gradient(180deg,hsl(222_44%_8%),hsl(222_44%_6%))] shadow-[0_18px_50px_hsl(222_47%_3%/0.45)]",
        className,
      )}
    >
      <div className="border-b border-border/70 px-5 py-5">
        <div className="flex min-h-[64px] items-center rounded-2xl border border-white/5 bg-white/[0.02] px-4">
          {brand}
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 px-4 py-5">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href || "#"}
            onClick={onItemClick}
            className={cn(
              "group flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm transition-colors",
              item.active
                ? "bg-primary/12 text-foreground ring-1 ring-primary/20"
                : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-3">
              {item.icon ? <span className="text-primary/90">{item.icon}</span> : null}
              <span className="font-medium">{item.label}</span>
            </span>
            {item.badge ? (
              <span className="rounded-full border border-border/80 bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                {item.badge}
              </span>
            ) : null}
          </a>
        ))}
      </nav>

      {footer ? <div className="border-t border-border/70 px-4 py-4">{footer}</div> : null}
    </aside>
  );
}

export interface DashboardSidebarProps {
  brand?: React.ReactNode;
  items?: SidebarNavItem[];
  footer?: React.ReactNode;
  mobileTitle?: string;
}

export function DashboardSidebar({
  brand = <div className="font-display text-lg font-bold tracking-tight text-foreground">JafLeadX AI</div>,
  items = dashboardSidebarMenuItems,
  footer,
  mobileTitle = "Navigation",
}: DashboardSidebarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      <div className="lg:hidden">
        <div className="fixed left-4 top-4 z-50">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-[linear-gradient(180deg,hsl(222_44%_8%),hsl(222_44%_6%))] text-foreground shadow-[0_14px_40px_hsl(222_47%_3%/0.4)] transition-colors hover:border-primary/25"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[300px] border-r border-border/80 bg-[linear-gradient(180deg,hsl(222_44%_8%),hsl(222_44%_6%))] p-0 text-foreground sm:max-w-[300px]"
            >
              <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
                <p className="font-display text-base font-semibold tracking-tight">{mobileTitle}</p>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-secondary/60 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Close sidebar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <DashboardSidebarPanel brand={brand} items={items} footer={footer} onItemClick={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <DashboardSidebarPanel brand={brand} items={items} footer={footer} />
      </div>
    </>
  );
}

export interface DashboardSidebarLayoutProps {
  brand: React.ReactNode;
  sidebarItems: SidebarNavItem[];
  header?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardSidebarLayout({
  brand,
  sidebarItems,
  header,
  sidebarFooter,
  children,
}: DashboardSidebarLayoutProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_22%),linear-gradient(180deg,hsl(222_47%_6%),hsl(222_47%_5%))] text-foreground">
      <DashboardSidebar brand={brand} items={sidebarItems} footer={sidebarFooter} />
      <DashboardContainer className="py-6 lg:pl-[304px]">
        <div className="space-y-6">
          {header ? (
            <div className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(222_35%_7%))] px-6 py-5 shadow-[0_18px_50px_hsl(222_47%_3%/0.45)]">
              {header}
            </div>
          ) : null}
          <div className="space-y-6">{children}</div>
        </div>
      </DashboardContainer>
    </div>
  );
}
