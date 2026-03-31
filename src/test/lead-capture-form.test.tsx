import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { LeadCaptureForm } from "@/components/LeadCaptureForm";
import { AppProviders } from "@/App";
import { buildApiUrl } from "@/lib/api-client";

const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("sonner", async () => {
  const actual = await vi.importActual<typeof import("sonner")>("sonner");

  return {
    ...actual,
    toast: {
      ...actual.toast,
      success: (...args: unknown[]) => toastSuccess(...args),
      error: (...args: unknown[]) => toastError(...args),
    },
  };
});

describe("LeadCaptureForm", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("submits the form, shows success feedback, and clears the fields", async () => {
    global.fetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          message: "Lead captured successfully.",
          data: {
            lead: {
              name: "Ava",
            },
          },
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    ) as typeof fetch;

    render(
      <AppProviders>
        <LeadCaptureForm />
      </AppProviders>,
    );

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ava" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "+15550001111" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Need pricing details" } });
    fireEvent.click(screen.getByRole("button", { name: "Capture lead" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        buildApiUrl("/api/leads/capture"),
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    expect(await screen.findByText("Thanks, Ava. We received your message.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.getByLabelText("Phone")).toHaveValue("");
    expect(screen.getByLabelText("Message")).toHaveValue("");
    expect(toastSuccess).toHaveBeenCalledWith("Lead captured successfully.");
  });
});
