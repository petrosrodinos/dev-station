import { IntegrationProviders, type IntegrationProvider } from "@/features/integrations/interfaces/integrations.interfaces";

export const IntegrationProviderDescriptionOptions: { id: IntegrationProvider; description: string }[] = [
    { id: IntegrationProviders.GITHUB, description: "List and clone repositories from personal, company and client accounts." },
    { id: IntegrationProviders.LINEAR, description: "Browse teams, projects and issues, and hand an issue to an AI agent." },
    { id: IntegrationProviders.NOTION, description: "Project documentation and knowledge as context for the team and agents." },
    { id: IntegrationProviders.SLACK, description: "Coming soon." },
];

export function getIntegrationProviderDescription(provider: IntegrationProvider | string): string {
    return IntegrationProviderDescriptionOptions.find((o) => o.id === provider)?.description ?? "";
}
