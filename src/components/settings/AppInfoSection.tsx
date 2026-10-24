import { Info, RefreshCw, Smartphone, Sparkles } from "lucide-react";
import { useState } from "react";

import type { AppInfo } from "../../data/partner-settings-mock";
import { SettingsSheet } from "./SettingsSheet";
import { SettingsCard, SettingsInfoRow, SettingsNavRow, SettingsSection } from "./SettingsPrimitives";

/** Sprint 3.10 — App version, build and about. */
export function AppInfoSection({
  appInfo,
  onNotify,
  delay = 0,
}: {
  appInfo: AppInfo;
  onNotify: (message: string) => void;
  delay?: number;
}) {
  const [about, setAbout] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkForUpdates = () => {
    setChecking(true);
    window.setTimeout(() => {
      setChecking(false);
      onNotify("You're on the latest version");
    }, 900);
  };

  return (
    <SettingsSection
      id="app-info"
      icon={Info}
      title="App Info"
      description="Version, build and about QuickPress"
      delay={delay}
    >
      <SettingsCard>
        <SettingsInfoRow icon={Smartphone} label="App Version" value={appInfo.version} />
        <SettingsInfoRow
          icon={Info}
          label="Build Number"
          value={`${appInfo.buildNumber} · ${appInfo.channel}`}
        />
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
            <RefreshCw
              className={`size-4 ${checking ? "animate-spin" : ""}`}
              strokeWidth={2.1}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight text-foreground">
              Check for Updates
            </p>
            <p className="truncate text-[0.7rem] font-medium text-muted-foreground">
              Released {appInfo.releasedOn}
            </p>
          </div>
          <button
            type="button"
            onClick={checkForUpdates}
            disabled={checking}
            className="ripple shrink-0 rounded-2xl bg-muted px-3.5 py-2 text-[0.68rem] font-bold tracking-tight text-foreground transition-all duration-300 active:scale-[0.96] disabled:opacity-50"
          >
            {checking ? "Checking…" : "Check"}
          </button>
        </div>
        <SettingsNavRow
          icon={Sparkles}
          label="About QuickPress Partner"
          value="What this app does for your shop"
          onClick={() => setAbout(true)}
        />
      </SettingsCard>

      <SettingsSheet
        open={about}
        title="About QuickPress Partner"
        subtitle={`Version ${appInfo.version} · Build ${appInfo.buildNumber}`}
        onClose={() => setAbout(false)}
      >
        <p className="text-sm font-medium leading-relaxed text-muted-foreground">
          QuickPress Partner is the shop-side companion for the QuickPress laundry and dry-clean
          network. Accept orders, manage services and pricing, track pickups and deliveries, settle
          earnings and stay in touch with customers — all from one app.
        </p>
        <p className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground">
          Built for laundry partners across India. © 2026 QuickPress. All rights reserved.
        </p>
      </SettingsSheet>
    </SettingsSection>
  );
}
