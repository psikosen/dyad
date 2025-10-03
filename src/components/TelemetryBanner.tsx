import { IpcClient } from "@/ipc/ipc_client";
import React from "react";
import { Button } from "./ui/button";
import { atom, useAtom } from "jotai";
import { useSettings } from "@/hooks/useSettings";

const TELEMETRY_REMIND_LATER_KEY = "dyadTelemetryBannerRemindAt";
const TELEMETRY_REMIND_LATER_INTERVAL_MS = 1000 * 60 * 60 * 24 * 7;
const SHERLOCK_PROMPT = `Continuous skepticism (Sherlock Protocol)
* Could this change affect unexpected files/systems?
* Any hidden dependencies or cascades?
* What edge cases and failure modes are unhandled?
* If stuck, work backward from the desired outcome.`;

const hideBannerAtom = atom(false);

type TelemetryAction = "opted_in" | "opted_out" | "later";

function logTelemetryInteraction(
  functionName: string,
  message: string,
  action: TelemetryAction,
  error: unknown = null,
) {
  const logEntry = {
    filename: "src/components/TelemetryBanner.tsx",
    timestamp: new Date().toISOString(),
    classname: "PrivacyBanner",
    function: functionName,
    system_section: "ui.telemetry",
    line_num: 0,
    error: error instanceof Error ? error.message : error,
    db_phase: "none" as const,
    method: "NONE" as const,
    message,
    action,
  };
  console.info(JSON.stringify(logEntry));
  console.info(SHERLOCK_PROMPT);
}

const isBrowser = typeof window !== "undefined";

function readRemindLaterTimestamp(): number | null {
  if (!isBrowser) {
    return null;
  }
  const storedValue = window.localStorage.getItem(TELEMETRY_REMIND_LATER_KEY);
  if (!storedValue) {
    return null;
  }
  const parsedValue = Number.parseInt(storedValue, 10);
  if (Number.isNaN(parsedValue)) {
    window.localStorage.removeItem(TELEMETRY_REMIND_LATER_KEY);
    return null;
  }
  return parsedValue;
}

function persistRemindLaterTimestamp(timestamp: number | null) {
  if (!isBrowser) {
    return;
  }
  if (timestamp === null) {
    window.localStorage.removeItem(TELEMETRY_REMIND_LATER_KEY);
    return;
  }
  window.localStorage.setItem(TELEMETRY_REMIND_LATER_KEY, timestamp.toString());
}

export function PrivacyBanner() {
  const [hideBanner, setHideBanner] = useAtom(hideBannerAtom);
  const { settings, updateSettings } = useSettings();
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    const remindAt = readRemindLaterTimestamp();
    if (remindAt && remindAt > Date.now()) {
      setHideBanner(true);
    } else if (remindAt && remindAt <= Date.now()) {
      persistRemindLaterTimestamp(null);
      setHideBanner(false);
    }
  }, [setHideBanner]);

  const handleConsentSelection = React.useCallback(
    async (consent: "opted_in" | "opted_out") => {
      if (isProcessing) {
        return;
      }
      setIsProcessing(true);
      try {
        await updateSettings({ telemetryConsent: consent });
        setHideBanner(true);
        persistRemindLaterTimestamp(null);
        logTelemetryInteraction(
          "handleConsentSelection",
          "User updated telemetry consent.",
          consent,
        );
      } catch (error) {
        console.error("Failed to update telemetry settings", error);
        logTelemetryInteraction(
          "handleConsentSelection",
          "Failed to update telemetry consent.",
          consent,
          error,
        );
        setHideBanner(false);
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, setHideBanner, updateSettings],
  );

  const handleRemindLater = React.useCallback(() => {
    const remindAt = Date.now() + TELEMETRY_REMIND_LATER_INTERVAL_MS;
    persistRemindLaterTimestamp(remindAt);
    setHideBanner(true);
    logTelemetryInteraction(
      "handleRemindLater",
      "User postponed telemetry consent decision.",
      "later",
    );
  }, [setHideBanner]);

  if (hideBanner) {
    return null;
  }
  if (settings?.telemetryConsent !== "unset") {
    return null;
  }
  return (
    <div className="fixed bg-(--background)/90 bottom-4 right-4  backdrop-blur-md border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-lg z-50 max-w-md">
      <div className="flex flex-col gap-3">
        <div>
          <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200">
            Share anonymous data?
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Help improve Dyad with anonymous usage data.
            <em className="block italic mt-0.5">
              Note: this does not log your code or messages.
            </em>
            <a
              onClick={() => {
                IpcClient.getInstance().openExternalUrl(
                  "https://dyad.sh/docs/policies/privacy-policy",
                );
              }}
              className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Learn more
            </a>
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            variant="default"
            onClick={() => {
              void handleConsentSelection("opted_in");
            }}
            data-testid="telemetry-accept-button"
            disabled={isProcessing}
          >
            Accept
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              void handleConsentSelection("opted_out");
            }}
            data-testid="telemetry-reject-button"
            disabled={isProcessing}
          >
            Reject
          </Button>
          <Button
            variant="ghost"
            onClick={handleRemindLater}
            data-testid="telemetry-later-button"
            disabled={isProcessing}
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}
