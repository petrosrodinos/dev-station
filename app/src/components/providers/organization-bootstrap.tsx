import { useEffect, type ReactNode } from "react";
import { useGetMe } from "@/features/users/hooks/use-users";
import { useGetPreferences, useUpdatePreferences } from "@/features/users/hooks/use-users";
import { useWorkspaceStore } from "@/stores/workspace";

/**
 * Keeps an active organization selected: the stored one if the user still belongs to it,
 * otherwise the server-side preference, otherwise the first membership.
 */
export function OrganizationBootstrap({ children }: { children: ReactNode }) {
  const { data: me } = useGetMe();
  const { data: preferences } = useGetPreferences();
  const activeOrgId = useWorkspaceStore((s) => s.active_organization_id);
  const setActiveOrganization = useWorkspaceStore((s) => s.setActiveOrganization);
  const { mutate: savePreference } = useUpdatePreferences();

  useEffect(() => {
    if (!me) return;
    const orgs = me.organizations;
    if (activeOrgId && orgs.some((o) => o.id === activeOrgId)) return;
    const preferred = preferences?.active_organization_id;
    const next = orgs.find((o) => o.id === preferred) ?? orgs[0] ?? null;
    setActiveOrganization(next?.id ?? null);
  }, [me, preferences, activeOrgId, setActiveOrganization]);

  // Remember the choice across devices.
  useEffect(() => {
    if (activeOrgId && preferences && preferences.active_organization_id !== activeOrgId) {
      savePreference({ active_organization_id: activeOrgId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, preferences?.active_organization_id]);

  return <>{children}</>;
}
