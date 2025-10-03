import React from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { Provider as JotaiProvider } from "jotai";
import { PrivacyBanner } from "../TelemetryBanner";
import { useSettings } from "@/hooks/useSettings";
import type { UserSettings } from "@/lib/schemas";

vi.mock("@/hooks/useSettings", () => ({
  useSettings: vi.fn(),
}));

const openExternalUrl = vi.fn();
vi.mock("@/ipc/ipc_client", () => ({
  IpcClient: {
    getInstance: () => ({
      openExternalUrl,
    }),
  },
}));

const mockUpdateSettings = vi.fn();

const baseSettings: UserSettings = {
  selectedModel: {
    name: "auto",
    provider: "auto",
  },
  providerSettings: {},
  telemetryConsent: "unset",
  selectedTemplateId: "react",
  enableAutoUpdate: true,
  releaseChannel: "stable",
};

describe("TelemetryBanner", () => {
  const mockedUseSettings = vi.mocked(useSettings);

  beforeEach(() => {
    mockedUseSettings.mockReturnValue({
      settings: baseSettings,
      envVars: {},
      loading: false,
      error: null,
      updateSettings: mockUpdateSettings,
      refreshSettings: vi.fn(),
    } as unknown as ReturnType<typeof useSettings>);
    mockUpdateSettings.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders banner when telemetry consent is unset", () => {
    mockUpdateSettings.mockResolvedValue({ ...baseSettings });
    render(
      <JotaiProvider>
        <PrivacyBanner />
      </JotaiProvider>,
    );
    expect(screen.getByTestId("telemetry-accept-button")).toBeTruthy();
  });

  it("updates settings when accepting telemetry", async () => {
    mockUpdateSettings.mockResolvedValue({
      ...baseSettings,
      telemetryConsent: "opted_in",
    });
    render(
      <JotaiProvider>
        <PrivacyBanner />
      </JotaiProvider>,
    );

    fireEvent.click(screen.getByTestId("telemetry-accept-button"));

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        telemetryConsent: "opted_in",
      });
    });
  });

  it("snoozes banner when selecting remind later", async () => {
    mockUpdateSettings.mockResolvedValue({ ...baseSettings });
    const { unmount } = render(
      <JotaiProvider>
        <PrivacyBanner />
      </JotaiProvider>,
    );

    fireEvent.click(screen.getByTestId("telemetry-later-button"));

    const storedValue = window.localStorage.getItem(
      "dyadTelemetryBannerRemindAt",
    );
    expect(storedValue).not.toBeNull();
    expect(Number(storedValue)).toBeGreaterThan(Date.now());
    await waitFor(() => {
      expect(screen.queryByTestId("telemetry-accept-button")).toBeNull();
    });

    // Simulate the reminder expiry on a subsequent app load.
    window.localStorage.setItem(
      "dyadTelemetryBannerRemindAt",
      String(Date.now() - 1000),
    );
    unmount();

    render(
      <JotaiProvider>
        <PrivacyBanner />
      </JotaiProvider>,
    );

    await waitFor(() => {
      expect(
        window.localStorage.getItem("dyadTelemetryBannerRemindAt"),
      ).toBeNull();
    });
    expect(screen.getByTestId("telemetry-accept-button")).toBeTruthy();
  });
});
