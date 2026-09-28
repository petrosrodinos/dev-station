import type { FC } from "react";
import { NavLink, useParams } from "react-router-dom";
import { Bot, Building2, GitBranch, Palette, Plug, Settings, UserRound } from "lucide-react";
import { SettingsSectionOptions, SettingsSections, type SettingsSection } from "@/config/constants/dropdowns/settings/settings-section.options";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { GeneralSettings } from "./components/general-settings";
import { ThemeSettings } from "./components/theme-settings";
import { GitSettings } from "./components/git-settings";
import { AiSettings } from "./components/ai-settings";
import { IntegrationsSettings } from "./components/integrations-settings";
import { OrganizationSettings } from "./components/organization-settings";
import { AccountSettings } from "./components/account-settings";

const SECTION_ICONS: Record<SettingsSection, typeof Settings> = {
  [SettingsSections.GENERAL]: Settings,
  [SettingsSections.THEME]: Palette,
  [SettingsSections.GIT]: GitBranch,
  [SettingsSections.AI]: Bot,
  [SettingsSections.INTEGRATIONS]: Plug,
  [SettingsSections.ORGANIZATION]: Building2,
  [SettingsSections.ACCOUNT]: UserRound,
};

const SECTION_PAGES: Record<SettingsSection, FC> = {
  [SettingsSections.GENERAL]: GeneralSettings,
  [SettingsSections.THEME]: ThemeSettings,
  [SettingsSections.GIT]: GitSettings,
  [SettingsSections.AI]: AiSettings,
  [SettingsSections.INTEGRATIONS]: IntegrationsSettings,
  [SettingsSections.ORGANIZATION]: OrganizationSettings,
  [SettingsSections.ACCOUNT]: AccountSettings,
};

/** Application settings (Spec §28). Device-only values are stored locally; preferences sync across devices. */
const SettingsPage: FC = () => {
  const { section } = useParams();
  const current = (SettingsSectionOptions.some((s) => s.id === section) ? section : SettingsSections.GENERAL) as SettingsSection;
  const Section = SECTION_PAGES[current];

  return (
    <div className="flex h-full min-h-0 gap-6 p-6">
      <nav className="flex w-44 shrink-0 flex-col gap-0.5" aria-label="Settings sections">
        <div className="mb-2 text-lg font-medium">Settings</div>
        {SettingsSectionOptions.map((s) => {
          const Icon = SECTION_ICONS[s.id];
          return (
            <NavLink
              key={s.id}
              to={Routes.workspace.settings_section(s.id)}
              className={cn("flex h-8 items-center gap-2 rounded-sm px-2 text-[0.8125rem] text-body hover:bg-surface-elevated", current === s.id && "bg-surface-elevated text-foreground")}
            >
              <Icon className="size-3.5" /> {s.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="min-w-0 max-w-3xl flex-1 overflow-y-auto pb-8">
        <Section />
      </div>
    </div>
  );
};

export default SettingsPage;
