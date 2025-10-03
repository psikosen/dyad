import React from "react";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
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
  const reminderInterval = 1000 * 60 * 60 * 24 * 7;
  let currentSettings: UserSettings;

  beforeEach(() => {
    currentSettings = { ...baseSettings };
    mockUpdateSettings.mockReset();
    mockUpdateSettings.mockImplementation(async (partial) => {
      currentSettings = {
        ...currentSettings,
        ...partial,
      };
      return currentSettings;
    });
    mockedUseSettings.mockImplementation(
      () =>
        ({
          settings: currentSettings,
          envVars: {},
          loading: false,
          error: null,
          updateSettings: mockUpdateSettings,
          refreshSettings: vi.fn(),
        }) as unknown as ReturnType<typeof useSettings>,
    );
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    mockedUseSettings.mockReset();
  });

  function renderBanner() {
    return render(
      <JotaiProvider>
        <PrivacyBanner />
      </JotaiProvider>,
    );
  }

  function mockTimeouts() {
    const callbacks: Array<() => void> = [];
    const originalSetTimeout = window.setTimeout.bind(window);
    const originalClearTimeout = window.clearTimeout.bind(window);
    const timeoutSpy = vi.spyOn(window, "setTimeout").mockImplementation(((
      handler: TimerHandler,
      _timeout?: number,
      ...args: unknown[]
    ) => {
      if (typeof _timeout === "number" && _timeout > 1000) {
        const index = callbacks.push(() => {
          if (typeof handler === "function") {
            handler(...args);
          }
          callbacks[index - 1] = () => {};
        });
        return -index as unknown as number;
      }
      return originalSetTimeout(
        handler as Parameters<typeof window.setTimeout>[0],
        _timeout as Parameters<typeof window.setTimeout>[1],
        ...args,
      );
    }) as unknown as typeof window.setTimeout);

    const clearTimeoutSpy = vi
      .spyOn(window, "clearTimeout")
      .mockImplementation((handle?: number | null) => {
        if (typeof handle === "number" && handle < 0) {
          const index = Math.abs(handle) - 1;
          if (callbacks[index]) {
            callbacks[index] = () => {};
          }
          return;
        }
        originalClearTimeout(handle as number);
      });

    return {
      callbacks,
      restore: () => {
        timeoutSpy.mockRestore();
        clearTimeoutSpy.mockRestore();
      },
    };
  }

  it("renders banner when telemetry consent is unset", () => {
    renderBanner();
    expect(screen.getByTestId("telemetry-accept-button")).toBeTruthy();
  });

  it("updates settings when accepting telemetry", async () => {
    renderBanner();

    fireEvent.click(screen.getByTestId("telemetry-accept-button"));

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        telemetryConsent: "opted_in",
      });
    });

    await waitFor(() => {
      expect(
        window.localStorage.getItem("dyadTelemetryBannerRemindAt"),
      ).toBeNull();
    });
    expect(screen.queryByTestId("telemetry-accept-button")).toBeNull();
  });

  it("updates settings when rejecting telemetry", async () => {
    renderBanner();

    fireEvent.click(screen.getByTestId("telemetry-reject-button"));

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        telemetryConsent: "opted_out",
      });
    });
    await waitFor(() => {
      expect(
        window.localStorage.getItem("dyadTelemetryBannerRemindAt"),
      ).toBeNull();
    });
    expect(screen.queryByTestId("telemetry-accept-button")).toBeNull();
  });

  it("keeps banner visible when settings update fails", async () => {
    mockUpdateSettings.mockImplementation(async () => {
      throw new Error("failed to update");
    });
    renderBanner();

    fireEvent.click(screen.getByTestId("telemetry-accept-button"));

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({
        telemetryConsent: "opted_in",
      });
    });

    expect(screen.getByTestId("telemetry-accept-button")).toBeTruthy();
  });

  it("snoozes banner when selecting remind later and restores after interval", async () => {
    const timers = mockTimeouts();
    try {
      renderBanner();

      fireEvent.click(screen.getByTestId("telemetry-later-button"));

      const storedValue = window.localStorage.getItem(
        "dyadTelemetryBannerRemindAt",
      );
      expect(storedValue).not.toBeNull();
      await waitFor(() => {
        expect(screen.queryByTestId("telemetry-accept-button")).toBeNull();
      });
      expect(timers.callbacks.length).toBeGreaterThan(0);
      act(() => {
        timers.callbacks.forEach((callback) => callback());
      });

      expect(
        window.localStorage.getItem("dyadTelemetryBannerRemindAt"),
      ).toBeNull();
      expect(screen.getByTestId("telemetry-accept-button")).toBeTruthy();
    } finally {
      timers.restore();
    }
  });

  it("respects stored remind-later timestamp on initial render", async () => {
    const timers = mockTimeouts();
    try {
      const futureReminder = Date.now() + reminderInterval;
      window.localStorage.setItem(
        "dyadTelemetryBannerRemindAt",
        futureReminder.toString(),
      );

      renderBanner();

      await waitFor(() => {
        expect(screen.queryByTestId("telemetry-accept-button")).toBeNull();
      });
      expect(timers.callbacks.length).toBeGreaterThan(0);
      act(() => {
        timers.callbacks.forEach((callback) => callback());
      });

      expect(
        window.localStorage.getItem("dyadTelemetryBannerRemindAt"),
      ).toBeNull();
      expect(screen.getByTestId("telemetry-accept-button")).toBeTruthy();
    } finally {
      timers.restore();
    }
  });
});
