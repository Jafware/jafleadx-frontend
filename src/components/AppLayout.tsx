import { AppSidebar } from "./AppSidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-transparent">
      <AppSidebar />
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl px-4 pb-10 pt-20 sm:px-6 md:px-8 md:pt-8 xl:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
