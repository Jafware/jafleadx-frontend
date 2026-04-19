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

  it("loads a lead detail view and updates status with backend values", async () => {
    let leadStatus = "new";

    global.fetch = vi.fn(async (input, init) => {
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
            data: {
              items: [
                {
                  id: "lead-1",
                  name: "Status Lead",
                  phone: "+91 9999999999",
                  status: leadStatus,
                  source: "website",
                  notes: "Needs status update",
                  lastContactAt: null,
                  createdAt: "2026-04-17T10:00:00.000Z",
                  updatedAt: "2026-04-17T10:00:00.000Z",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === buildApiUrl("/api/leads/lead-1") && !init?.method) {
        return new Response(
          JSON.stringify({
            data: {
              lead: {
                id: "lead-1",
                name: "Status Lead",
                phone: "+91 9999999999",
                status: leadStatus,
                source: "website",
                notes: "Needs status update",
                lastContactAt: null,
                createdAt: "2026-04-17T10:00:00.000Z",
                updatedAt: "2026-04-17T10:00:00.000Z",
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === buildApiUrl("/api/leads/lead-1") && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body));
        leadStatus = body.status;

        return new Response(
          JSON.stringify({
            message: "Lead updated successfully.",
            data: {
              lead: {
                id: "lead-1",
                name: "Status Lead",
                phone: "+91 9999999999",
                status: leadStatus,
                source: "website",
                notes: "Needs status update",
                lastContactAt: null,
                createdAt: "2026-04-17T10:00:00.000Z",
                updatedAt: "2026-04-17T11:00:00.000Z",
              },
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

    expect(await screen.findByRole("button", { name: "Status Lead" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Status Lead" }));

    expect(await screen.findByText("Current status: New")).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("combobox"));
    fireEvent.click(await screen.findByText("Follow-up"));

    await waitFor(() => {
      expect(screen.getByText("Current status: Follow-up")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Follow-up").length).toBeGreaterThan(0);
  });

  it("edits and saves lead notes from the detail dialog", async () => {
    let leadNotes = "Initial notes";

    global.fetch = vi.fn(async (input, init) => {
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
            data: {
              items: [
                {
                  id: "lead-2",
                  name: "Notes Lead",
                  phone: "+91 8888888888",
                  status: "new",
                  source: "manual",
                  notes: leadNotes,
                  lastContactAt: null,
                  createdAt: "2026-04-17T10:00:00.000Z",
                  updatedAt: "2026-04-17T10:00:00.000Z",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === buildApiUrl("/api/leads/lead-2") && !init?.method) {
        return new Response(
          JSON.stringify({
            data: {
              lead: {
                id: "lead-2",
                name: "Notes Lead",
                phone: "+91 8888888888",
                status: "new",
                source: "manual",
                notes: leadNotes,
                lastContactAt: null,
                createdAt: "2026-04-17T10:00:00.000Z",
                updatedAt: "2026-04-17T10:00:00.000Z",
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === buildApiUrl("/api/leads/lead-2") && init?.method === "PATCH") {
        const body = JSON.parse(String(init.body));
        leadNotes = body.notes;

        return new Response(
          JSON.stringify({
            message: "Lead updated successfully.",
            data: {
              lead: {
                id: "lead-2",
                name: "Notes Lead",
                phone: "+91 8888888888",
                status: "new",
                source: "manual",
                notes: leadNotes,
                lastContactAt: null,
                createdAt: "2026-04-17T10:00:00.000Z",
                updatedAt: "2026-04-17T11:00:00.000Z",
              },
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

    expect(await screen.findByRole("button", { name: "Notes Lead" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Notes Lead" }));

    const notesField = await screen.findByPlaceholderText("Add context, follow-up details, or qualification notes");
    fireEvent.change(notesField, { target: { value: "Updated notes for follow-up call" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Notes" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Updated notes for follow-up call")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Updated notes for follow-up call").length).toBeGreaterThan(0);
  });
});
