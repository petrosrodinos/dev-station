import { IntegrationProviders, type IntegrationProvider } from "@/features/integrations/interfaces/integrations.interfaces";

export const IntegrationProviderFormOptions: { id: IntegrationProvider; label: string }[] = [
    { id: IntegrationProviders.GITHUB, label: "GitHub" },
    { id: IntegrationProviders.LINEAR, label: "Linear" },
    { id: IntegrationProviders.NOTION, label: "Notion" },
    { id: IntegrationProviders.SLACK, label: "Slack" },
];

export function getIntegrationProviderLabel(provider: IntegrationProvider | string): string {
    return IntegrationProviderFormOptions.find((o) => o.id === provider)?.label ?? provider;
}
