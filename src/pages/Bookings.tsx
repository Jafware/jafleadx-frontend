import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useMemo, useState } from "react";
import { useAppData } from "@/context/AppDataContext";
import { useBilling } from "@/context/BillingContext";
import { Link } from "react-router-dom";

export default function Bookings() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { data } = useAppData();
  const { hasFeature } = useBilling();
  const selectedDate = date ? date.toISOString().slice(0, 10) : "";
  const filteredBookings = useMemo(
    () =>
      selectedDate
        ? data.bookings.filter((booking) => booking.date === selectedDate)
        : data.bookings,
    [data.bookings, selectedDate],
  );

  if (!hasFeature("bookings")) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl space-y-4 rounded-xl border border-border bg-card p-8 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
          <h1 className="text-2xl font-display font-bold text-foreground">Bookings are not in your plan</h1>
          <p className="text-sm text-muted-foreground">Upgrade to Growth or Pro to unlock calendar scheduling and appointment management.</p>
          <Button asChild>
            <Link to="/pricing">Upgrade Plan</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Bookings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage appointments and scheduling</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="rounded-xl border border-border bg-card p-5" style={{ boxShadow: "var(--shadow-card)" }}>
            <h2 className="font-display font-semibold text-foreground mb-4">Calendar</h2>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md"
            />
          </div>

          {/* Upcoming */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="p-5 border-b border-border">
              <h2 className="font-display font-semibold text-foreground">Upcoming Appointments</h2>
            </div>
            <div className="divide-y divide-border/50">
              {filteredBookings.map((b) => (
                <div key={b.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground">{b.name}</div>
                    <div className="text-xs text-muted-foreground">{b.type}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm text-foreground">{new Date(`${b.date}T00:00:00`).toLocaleDateString()}</div>
                    <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" /> {b.time}
                    </div>
                  </div>
                </div>
              ))}
              {filteredBookings.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground">No appointments scheduled for this date.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
