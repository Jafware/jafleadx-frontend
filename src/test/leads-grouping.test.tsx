import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/App";
import { buildApiUrl } from "@/lib/api-client";
import Leads from "@/pages/Leads";

vi.mock("sonner", async () => {
  const actual = await vi.importActual<typeof import("sonner")>("sonner");
  return actual;
});

describe("leads grouping and filters", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    HTMLElement.prototype.scrollIntoView = vi.fn();
    window.localStorage.setItem(
      "jafleadx-auth-user",
      JSON.stringify({
        id: "user-1",
        fullName: "Demo User",
        email: "demo@example.com",
      }),
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("groups database leads by source and filters by source", async () => {
    global.fetch = vi.fn(async (input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes("/api/billing/me")) {
        return new Response(
          JSON.stringify({
            data: {
              plan: "starter",
              status: "active",
              currentPeriodStart: null,
              currentPeriodEnd: null,
              subscriptionId: null,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === buildApiUrl("/api/leads")) {
        return new Response(
          JSON.stringify({
            message: "Leads fetched successfully.",
            data: {
              items: [
                { id: "1", name: "W Lead", phone: "+1", status: "new", source: "whatsapp", notes: null, lastContactAt: null, createdAt: "", updatedAt: "" },
                { id: "2", name: "Site Lead", phone: "+2", status: "qualified", source: "website", notes: null, lastContactAt: null, createdAt: "", updatedAt: "" },
                { id: "3", name: "Manual Lead", phone: "+3", status: "new", source: "manual", notes: null, lastContactAt: null, createdAt: "", updatedAt: "" },
                { id: "4", name: "Ads Lead", phone: "+4", status: "converted", source: "whatsapp_ad", notes: null, lastContactAt: null, createdAt: "", updatedAt: "" },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response("Not found", { status: 404 });
    }) as typeof fetch;

    render(
      <AppProviders>
        <MemoryRouter>
          <Leads />
        </MemoryRouter>
      </AppProviders>,
    );

    expect(await screen.findByText("Lead table")).toBeInTheDocument();
    expect(screen.getAllByText("WhatsApp").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Website").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Manual").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ads").length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("combobox")[1]);
    const manualOptions = await screen.findAllByText("Manual");
    fireEvent.click(manualOptions[manualOptions.length - 1]);

    await waitFor(() => {
      expect(screen.getByText("Manual Lead")).toBeInTheDocument();
      expect(screen.queryByText("W Lead")).not.toBeInTheDocument();
      expect(screen.queryByText("Site Lead")).not.toBeInTheDocument();
    });
  });
});
