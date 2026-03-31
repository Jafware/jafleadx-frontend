# JafLeadX AI Dashboard Design System

Reusable dashboard primitives for a Next.js + Tailwind SaaS app:

- `DashboardButton`
- `DashboardCard`
- `DashboardInput`
- `DashboardContainer`
- `DashboardSidebar`
- `DashboardSidebarLayout`

## Style direction

- Modern SaaS UI
- Slightly dark theme
- Rounded corners
- Clean spacing
- Professional, low-noise visual hierarchy

## Example

```tsx
import {
  DashboardButton,
  DashboardCard,
  DashboardContainer,
  DashboardInput,
  DashboardSidebar,
  DashboardSidebarLayout,
  dashboardSidebarMenuItems,
} from "@/design-system";

export default function Page() {
  return (
    <>
      <DashboardSidebar
        items={dashboardSidebarMenuItems.map((item) =>
          item.label === "Dashboard" ? { ...item, active: true } : item,
        )}
      />
      <DashboardContainer className="space-y-6 py-6 lg:pl-[304px]">
        <DashboardCard title="Welcome" description="Track your pipeline and conversions.">
          <div className="grid gap-4 md:grid-cols-2">
            <DashboardInput label="Business Name" placeholder="JafLeadX AI" />
            <DashboardButton>Save Changes</DashboardButton>
          </div>
        </DashboardCard>
      </DashboardContainer>
    </>
  );
}
```
