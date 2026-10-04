import "./landing.css";
import type { Metadata } from "next";
import { SiteNav } from "@/components/layout/site-nav";
import { SiteFooter } from "@/components/layout/site-footer";
import { Hero } from "./_components/home/hero";
import { AgentsSection, WorkspaceSection } from "./_components/home/workspace-sections";
import { IntegrationsSection } from "./_components/home/tooling-sections";
import { FaqSection, FinalCtaSection, LoopSection, faqs } from "./_components/home/workflow-sections";

const description =
  "A desktop workspace for AI-assisted development. Run Claude Code, Codex, Cursor and multiple coding agents across projects with terminals, previews, Git and project tools.";

export const metadata: Metadata = {
  title: { absolute: "AI Coding Agent Workspace for Developers | Dev Station" },
  description,
  keywords: [
    "AI coding agent workspace",
    "AI development environment",
    "AI coding agents",
    "multi-agent coding",
    "coding agent workspace",
    "AI developer tools",
    "Claude Code workspace",
    "Codex workspace",
    "Cursor alternative",
    "AI development workflow",
    "multiple AI coding agents",
    "agentic development",
  ],
  openGraph: {
    title: "Dev Station — a workspace for building with AI coding agents",
    description,
    type: "website",
  },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Dev Station",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Windows, macOS, Linux",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Dev Station is a desktop development workspace designed for developers who use AI coding agents. It lets developers manage multiple projects and agent sessions, run project scripts, view local application previews, work with Git, and connect development tools such as Linear and Notion from one workspace. It supports existing coding agents including Claude Code, Codex and Cursor.",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a.join(" ") },
    })),
  },
];

export default function Home() {
  return (
    <div className="landing">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <div className="stripes" aria-hidden="true"><i /><i /><i /></div>

      <SiteNav />

      <main id="top">
        <Hero />
        <WorkspaceSection />
        <AgentsSection />
        <IntegrationsSection />
        <LoopSection />
        <FaqSection />
        <FinalCtaSection />
      </main>

      <SiteFooter />
    </div>
  );
}
