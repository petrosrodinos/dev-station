import type { ReactNode } from "react";

/** Demo data for the interactive workspace mockup in the hero. */

export type TabId = "overview" | "git" | "files" | "preview";
export type SessionState = "working" | "input" | "review" | "committed";

export interface DemoService {
    name: string;
    cmd: string;
    port?: number;
    running: boolean;
}

export interface DemoProject {
    id: string;
    name: string;
    initials: string;
    /** Identicon seed, as stored in `projects.avatar_seed` in the app. */
    seed: string;
    color: string;
    repo: string;
    branch: string;
    url: string;
    services: DemoService[];
    files: string[];
    /** Rendered inside the preview panel; null = no service with a URL until one is started. */
    site: ReactNode;
}

export interface DemoChange {
    path: string;
    status: "M" | "A";
    add: number;
    del: number;
}

export interface DemoSession {
    id: string;
    projectId: string;
    name: string;
    agent: string;
    state: SessionState;
    prompt: string;
    steps: [verb: string, target: string, note?: string][];
    summary: string;
    question?: { text: string; options: string[] };
    answer?: string;
    changes: DemoChange[];
    diff: { kind: "c" | "a" | "d"; text: string }[];
    sha: string;
}

export const TABS: TabId[] = ["overview", "git", "files", "preview"];

export const PROJECTS: DemoProject[] = [
    {
        id: "storefront",
        name: "Storefront",
        initials: "SF",
        seed: "storefront",
        color: "#ff6161",
        repo: "acme/storefront",
        branch: "feat/discount-codes",
        url: "localhost:5173/checkout",
        services: [
            { name: "web", cmd: "npm run dev", port: 5173, running: true },
            { name: "storybook", cmd: "npm run storybook", running: false },
        ],
        files: ["▾ src", "  ▾ checkout", "    DiscountField.tsx", "    Summary.tsx", "  ▸ components", "  main.tsx", "package.json", "vite.config.ts"],
        site: (
            <div className="ds-site">
                <div className="ds-card">
                    <p className="ds-site-h">Order summary</p>
                    <div className="ds-line"><span>Linen shirt</span><span>$68.00</span></div>
                    <div className="ds-line"><span>Canvas tote</span><span>$24.00</span></div>
                    <div className="ds-code"><span>SUMMER15</span><b>Applied</b></div>
                    <div className="ds-line off"><span>Discount</span><span>−$13.80</span></div>
                    <div className="ds-line total"><span>Total</span><span>$78.20</span></div>
                    <div className="ds-pay">Checkout</div>
                </div>
            </div>
        ),
    },
    {
        id: "api",
        name: "API",
        initials: "AP",
        seed: "3b9d04aa",
        color: "#57c1ff",
        repo: "acme/api",
        branch: "fix/webhook-retries",
        url: "localhost:4000/health",
        services: [
            { name: "api", cmd: "npm run start:dev", port: 4000, running: true },
            { name: "worker", cmd: "npm run worker", running: true },
        ],
        files: ["▾ src", "  ▾ webhooks", "    retry.ts", "    retry.spec.ts", "  ▸ orders", "  main.ts", "package.json", "tsconfig.json"],
        site: (
            <div className="ds-site json">
                <pre>{`{
  "status": "ok",
  "uptime": 8421,
  "queue": {
    "pending": 3,
    "retrying": 1
  }
}`}</pre>
            </div>
        ),
    },
    {
        id: "docs",
        name: "Docs",
        initials: "DC",
        seed: "docs",
        color: "#59d499",
        repo: "acme/docs",
        branch: "main",
        url: "localhost:3000/setup",
        services: [{ name: "docs", cmd: "npm run dev", port: 3000, running: true }],
        files: ["▾ content", "    setup.mdx", "    deploy.mdx", "  ▸ public", "next.config.ts", "package.json"],
        site: (
            <div className="ds-site docs">
                <div className="ds-doc">
                    <small>Getting started</small>
                    <p className="ds-site-h">Setup guide</p>
                    <span className="bar" /><span className="bar" /><span className="bar short" />
                    <code>npm install && npm run dev</code>
                    <span className="bar" /><span className="bar short" />
                </div>
            </div>
        ),
    },
    {
        id: "mobile",
        name: "Mobile",
        initials: "MB",
        seed: "mobile",
        color: "#ffc533",
        repo: "acme/mobile",
        branch: "main",
        url: "localhost:8081",
        services: [{ name: "expo", cmd: "npx expo start --web", port: 8081, running: false }],
        files: ["▾ app", "    (tabs)", "    _layout.tsx", "  ▸ assets", "app.json", "package.json"],
        site: (
            <div className="ds-site phone">
                <div className="ds-phone">
                    <span className="notch" />
                    <p className="ds-site-h">Good morning</p>
                    <span className="tile" /><span className="tile" /><span className="tile half" />
                </div>
            </div>
        ),
    },
];

export const INITIAL_SESSIONS: DemoSession[] = [
    {
        id: "s-discount",
        projectId: "storefront",
        name: "Discount codes",
        agent: "Claude Code",
        state: "review",
        prompt: "Add discount codes to the checkout summary",
        steps: [["Read", "src/checkout/Summary.tsx"], ["Created", "src/checkout/DiscountField.tsx"], ["Ran", "npm run test", "42 passed"]],
        summary: "Discount codes now apply at checkout and the total updates live. Ready for your review.",
        changes: [
            { path: "src/checkout/Summary.tsx", status: "M", add: 14, del: 6 },
            { path: "src/checkout/DiscountField.tsx", status: "A", add: 58, del: 0 },
            { path: "src/checkout/DiscountField.test.tsx", status: "A", add: 44, del: 0 },
            { path: "src/checkout/totals.ts", status: "M", add: 4, del: 32 },
        ],
        diff: [
            { kind: "c", text: "  <LineItems items={items} />" },
            { kind: "d", text: "- <Total value={subtotal} />" },
            { kind: "a", text: "+ <DiscountField onApply={setDiscount} />" },
            { kind: "a", text: "+ <Total value={subtotal - discount} />" },
        ],
        sha: "a1b2c3d",
    },
    {
        id: "s-webhooks",
        projectId: "api",
        name: "Webhook retries",
        agent: "Cursor",
        state: "working",
        prompt: "Retry failed webhooks with exponential backoff on 429",
        steps: [["Read", "src/webhooks/retry.ts"], ["Edited", "src/webhooks/retry.ts"], ["Ran", "npm test -- retry", "12 passed"]],
        summary: "429 responses now retry with backoff (1s, 2s, 4s, max 5). Tests added for the retry schedule.",
        changes: [
            { path: "src/webhooks/retry.ts", status: "M", add: 31, del: 9 },
            { path: "src/webhooks/retry.spec.ts", status: "M", add: 48, del: 2 },
        ],
        diff: [
            { kind: "d", text: "- if (res.status >= 500) retry()" },
            { kind: "a", text: "+ if (res.status >= 500 || res.status === 429)" },
            { kind: "a", text: "+   retry({ delay: 2 ** attempt * 1000 })" },
        ],
        sha: "9f4e21b",
    },
    {
        id: "s-setup",
        projectId: "docs",
        name: "Setup guide",
        agent: "Claude Code",
        state: "input",
        prompt: "Update the setup guide for the new CLI",
        steps: [["Read", "content/setup.mdx"], ["Edited", "content/setup.mdx"], ["Ran", "npm run build", "no broken links"]],
        summary: "The setup guide now uses Node 22 and the new CLI commands throughout.",
        question: { text: "The guide still says Node 18. Update every example to Node 22?", options: ["Yes, update all", "Only the install step"] },
        changes: [{ path: "content/setup.mdx", status: "M", add: 22, del: 17 }],
        diff: [
            { kind: "d", text: "- Requires Node 18 or later." },
            { kind: "a", text: "+ Requires Node 22 or later." },
        ],
        sha: "5c0d7e2",
    },
];
