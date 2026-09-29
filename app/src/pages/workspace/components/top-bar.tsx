import { useNavigate, useNavigationType } from "react-router-dom";
import { ArrowLeft, ArrowRight, Keyboard, LogOut, Maximize, Minimize, Moon, PanelRight, Search, Settings, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShortcutKeys } from "@/components/ui/shortcut-keys";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentOrganization, usePermissions } from "@/features/organizations/hooks/use-organizations";
import { PermissionKeys } from "@/features/organizations/interfaces/organizations.interfaces";
import { useSignOut } from "@/features/auth/hooks/use-auth";
import { useUpdatePreferences } from "@/features/users/hooks/use-users";
import { useResolvedShortcuts } from "@/features/users/hooks/use-shortcuts";
import { ShortcutActions } from "@/config/constants/dropdowns/shared/shortcut-action.options";
import { formatComboParts } from "@/lib/shortcuts.utils";
import { generateInitials } from "@/features/auth/utils/auth.utils";
import { SettingsSections } from "@/config/constants/dropdowns/settings/settings-section.options";
import { useDialogsStore } from "@/stores/dialogs";
import { useWorkspaceStore } from "@/stores/workspace";
import { useTheme } from "@/hooks/use-theme";
import { useFullScreen } from "@/hooks/use-fullscreen";
import { isDesktop } from "@/lib/desktop";
import { environments } from "@/config/environments";
import { Routes } from "@/routes/routes";
import { cn } from "@/lib/utils";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { LayoutMenu } from "./layout-menu";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

function useHistoryNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const stack = useRef<string[]>([]);
  const pointer = useRef(-1);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  useEffect(() => {
    const key = location.key ?? "default";
    if (navigationType === "PUSH") {
      stack.current = stack.current.slice(0, pointer.current + 1);
      stack.current.push(key);
      pointer.current = stack.current.length - 1;
    } else if (navigationType === "REPLACE") {
      if (pointer.current < 0) pointer.current = 0;
      stack.current[pointer.current] = key;
    } else if (navigationType === "POP") {
      const idx = stack.current.indexOf(key);
      if (idx !== -1) pointer.current = idx;
    }
    setCanGoBack(pointer.current > 0);
    setCanGoForward(pointer.current < stack.current.length - 1);
  }, [location.key, navigationType]);

  return {
    canGoBack,
    canGoForward,
    goBack: () => navigate(-1),
    goForward: () => navigate(1),
  };
}

export function TopBar() {
  const navigate = useNavigate();
  const { canGoBack, canGoForward, goBack, goForward } = useHistoryNav();
  const { me } = useCurrentOrganization();
  const { can } = usePermissions();
  const aiPanelOpen = useWorkspaceStore((s) => s.ai_panel_open);
  const setAiPanelOpen = useWorkspaceStore((s) => s.setAiPanelOpen);
  const setCommandPalette = useDialogsStore((s) => s.setCommandPalette);
  const signOut = useSignOut();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const shortcuts = useResolvedShortcuts();
  const paletteCombo = shortcuts.find((s) => s.id === ShortcutActions.COMMAND_PALETTE)?.combo;
  const aiPanelCombo = shortcuts.find((s) => s.id === ShortcutActions.TOGGLE_AI_PANEL)?.combo;
  const { theme, setTheme } = useTheme();
  const { isFullScreen, toggle: toggleFullScreen } = useFullScreen();
  const savePreferences = useUpdatePreferences();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const toggleDarkMode = (checked: boolean) => {
    const next = checked ? "dark" : "light";
    setTheme(next);
    savePreferences.mutate({ theme: next });
  };

  return (
    <header className="app-drag flex h-12 shrink-0 items-center gap-3 border-b bg-canvas px-3">
      <button
        onClick={() => navigate(Routes.workspace.root)}
        className="app-no-drag flex items-center gap-2 text-[0.8125rem] font-semibold tracking-[0.2px]"
        aria-label="Go to workspace home"
      >
        <span className="size-[18px] rounded-[5px] bg-gradient-to-br from-[#ff5757] to-[#a1131a]" aria-hidden />
        <span className="hidden md:inline">{environments.APP_NAME}</span>
      </button>

      <div className="app-no-drag flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" disabled={!canGoBack} onClick={goBack} aria-label="Go back">
                <ArrowLeft className="size-4" />
              </Button>
            }
          />
          <TooltipContent>Back</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" disabled={!canGoForward} onClick={goForward} aria-label="Go forward">
                <ArrowRight className="size-4" />
              </Button>
            }
          />
          <TooltipContent>Forward</TooltipContent>
        </Tooltip>
      </div>

      <div className="app-drag min-w-0 flex-1" />

      <button
        onClick={() => setCommandPalette(true)}
        className="app-no-drag flex h-7 w-72 min-w-7 shrink items-center gap-2 rounded-md border bg-surface-elevated px-2.5 text-[0.7813rem] text-ash hover:border-hairline-strong"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left max-md:hidden">Search projects, issues…</span>
        {paletteCombo && (
          <span className="shrink-0 max-lg:hidden">
            <ShortcutKeys combo={paletteCombo} />
          </span>
        )}
      </button>

      <div className="app-no-drag flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={toggleFullScreen} aria-label={isFullScreen ? "Exit full screen" : "Enter full screen"}>
                {isFullScreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </Button>
            }
          />
          <TooltipContent>{isFullScreen ? "Exit full screen" : "Enter full screen"}{isDesktop() ? " (F11)" : ""}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground" onClick={() => setShortcutsOpen(true)} aria-label="Keyboard shortcuts">
                <Keyboard className="size-4" />
              </Button>
            }
          />
          <TooltipContent>Keyboard shortcuts</TooltipContent>
        </Tooltip>
        <LayoutMenu />
        {can(PermissionKeys.AI_USE_AGENTS) && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon" className={cn("size-7 text-muted-foreground", aiPanelOpen && "text-foreground")} onClick={() => setAiPanelOpen(!aiPanelOpen)} aria-label="Toggle AI panel">
                  <PanelRight className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Toggle AI panel{aiPanelCombo ? ` (${formatComboParts(aiPanelCombo).join(" ")})` : ""}</TooltipContent>
          </Tooltip>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="ml-1 flex size-7 items-center justify-center rounded-full border bg-surface-card text-[0.6875rem] font-semibold" aria-label="Account">
                {generateInitials(me?.full_name || me?.email)}
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="truncate text-sm">{me?.full_name || "Account"}</div>
              <div className="truncate text-xs font-normal text-muted-foreground">{me?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate(Routes.workspace.settings_section(SettingsSections.ACCOUNT))} className="gap-2">
              <UserRound className="size-3.5" /> Account
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(Routes.workspace.settings)} className="gap-2">
              <Settings className="size-3.5" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem closeOnClick={false} className="gap-2">
              <Moon className="size-3.5" />
              <span className="flex-1">Dark mode</span>
              <Switch checked={isDark} onCheckedChange={toggleDarkMode} />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut} className="gap-2 text-danger focus:text-danger">
              <LogOut className="size-3.5" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </header>
  );
}
