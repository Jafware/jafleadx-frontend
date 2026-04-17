import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders, AppRoutes } from "@/App";
import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/api-client";

describe("app routes", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/dashboard");
    vi.restoreAllMocks();
  });

  it("redirects unauthenticated dashboard visits to auth", async () => {
    render(
      <AppProviders>
        <MemoryRouter
          initialEntries={["/dashboard"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <AppRoutes />
        </MemoryRouter>
      </AppProviders>,
    );

    expect(await screen.findByText("Welcome back")).toBeInTheDocument();
  });

  it("redirects authenticated users without an active subscription to pricing", async () => {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, "test-token");

    vi.spyOn(window, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/api/auth/me")) {
        return new Response(
          JSON.stringify({
            data: {
              user: {
                id: "user-1",
                fullName: "Test User",
                email: "test@example.com",
              },
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.includes("/api/billing/me")) {
        return new Response(
          JSON.stringify({
            data: {
              plan: "starter",
              status: "inactive",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      throw new Error(`Unexpected fetch request: ${url}`);
    });

    render(
      <AppProviders>
        <MemoryRouter
          initialEntries={["/dashboard"]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <AppRoutes />
        </MemoryRouter>
      </AppProviders>,
    );

    await waitFor(() => {
      expect(screen.getByText("Choose Your Plan")).toBeInTheDocument();
    });
  });
});
