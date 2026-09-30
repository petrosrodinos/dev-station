import "./landing.css";
import type { CSSProperties } from "react";
import Link from "next/link";
import { environments } from "@/config/environments";
import { Routes } from "@/routes/routes";

const signInUrl = `${environments.appUrl}${Routes.app.signIn}`;
const signUpUrl = `${environments.appUrl}${Routes.app.signUp}`;

export default function Home() {
  return (
    <div className="landing">
<div className="stripes" aria-hidden="true"><i /><i /><i /></div>

<nav>
  <div className="wrap">
    <a className="logo" href="#top" aria-label="Dev Station home">
      <svg viewBox="0 0 24 24" fill="none"><rect x="1" y="1" width="22" height="22" rx="6" fill="#121212" stroke="#242728"/><path d="M6 8l4 4-4 4" stroke="#ff6161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12.5 16H18" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
      Dev Station
    </a>
    <div className="nav-links">
      <a href="#workspace">Workspace</a>
      <a href="#features">Features</a>
      <a href="#workflow">Workflow</a>
      <a href="#integrations">Integrations</a>
      <Link href={Routes.downloads}>Download</Link>
    </div>
    <div className="nav-cta">
        <a className="btn btn-ghost" href={signInUrl}>Sign in</a>
        <a className="btn btn-primary" href={signUpUrl}>Sign up</a>
      </div>
  </div>
</nav>

<main id="top">
<header className="wrap hero">
  <span className="eyebrow"><b>New</b> Claude Code and Cursor CLI sessions, built in</span>
  <h1>Every client project. <em>One workspace.</em></h1>
  <p className="lead">Dev Station is the desktop app for agencies juggling many codebases. Start services, hand Linear issues to an AI agent, review the diff and push, then jump to the next client in one keystroke.</p>
  <div className="cta">
    <a className="btn btn-primary btn-lg" href={signUpUrl}>Get started free</a>
    <Link className="btn btn-ghost btn-lg" href={Routes.downloads}>Download the app</Link>
    <a className="btn btn-ghost btn-lg" href="#workspace">See the workspace</a>
  </div>
  <p className="fine">Windows, macOS and Linux. Built on Electron.</p>

  <div className="stage">
    <div className="palette" role="img" aria-label="Dev Station command palette listing client projects with their running status">
      <div className="p-search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <span>Switch project<i className="caret" /></span>
        <kbd>Ctrl</kbd><kbd>K</kbd>
      </div>
      <div className="p-label">Projects</div>
      <div className="p-list">
        <div className="row active"><span className="dot" style={{"background":"#ff6161"}}>NB</span>Northbeam storefront<span className="meta">acme/northbeam · main</span><span className="end"><span className="st" />3 services</span></div>
        <div className="row"><span className="dot" style={{"background":"#57c1ff"}}>LR</span>Lumen Realty portal<span className="meta">lumen/portal · feat/search</span><span className="end"><span className="st y" />Agent working</span></div>
        <div className="row"><span className="dot" style={{"background":"#59d499"}}>HK</span>Harbor Kitchen ordering<span className="meta">harbor/ordering · main</span><span className="end"><span className="st o" />Stopped</span></div>
        <div className="row"><span className="dot" style={{"background":"#ffc533"}}>PL</span>Pilot Labs API<span className="meta">pilot/api · fix/webhooks</span><span className="end"><span className="st" />2 services</span></div>
      </div>
      <div className="p-foot">
        <span><kbd>↵</kbd> Open workspace</span>
        <span><kbd>Ctrl</kbd><kbd>↵</kbd> Start services</span>
        <span><kbd>Ctrl</kbd><kbd>N</kbd> New agent session</span>
      </div>
    </div>
  </div>
</header>

<section id="workspace">
  <div className="wrap">
    <div className="sec-head">
      <p className="kicker">Workspace</p>
      <h2>Your client list is the navigation</h2>
      <p>A left rail of projects, each with its own color that follows it everywhere: services, Git, and every AI session tab. You always know which client you are touching.</p>
    </div>

    <div className="app" role="img" aria-label="Dev Station workspace showing a project rail, agent session tabs, a Claude Code terminal, a Git diff and running services">
      <div className="rail">
        <span className="dot on" style={{"background":"#ff6161","--c":"#ff6161"} as CSSProperties}>NB<span className="b" /></span>
        <span className="dot" style={{"background":"#57c1ff"}}>LR<span className="b y" /></span>
        <span className="dot" style={{"background":"#59d499"}}>HK</span>
        <span className="dot" style={{"background":"#ffc533"}}>PL<span className="b" /></span>
        <span className="sep"></span>
        <span className="dot" style={{"background":"#121212","color":"#9c9c9d","border":"1px solid #242728"}}>+</span>
      </div>
      <div className="main">
        <div className="tabs">
          <span className="tab on" style={{"--c":"#ff6161"} as CSSProperties}><i />Northbeam · Claude Code</span>
          <span className="tab" style={{"--c":"#57c1ff"} as CSSProperties}><i />Lumen · Cursor CLI</span>
          <span className="tab" style={{"--c":"#ffc533"} as CSSProperties}><i />Pilot · Claude Code</span>
        </div>
        <div className="cols">
          <div className="pane">
            <h4>Agent session</h4>
            <div className="term">
<span className="m">$</span> <span className="w">claude</span>  <span className="m"># issue NB-214 attached as context</span><br />
<span className="b">●</span> Reading NB-214: <span className="w">Cart total ignores discount codes</span><br />
<span className="b">●</span> Found <span className="w">src/cart/totals.ts</span><br />
<span className="g">✓</span> Updated applyDiscount() and added 3 tests<br />
<span className="g">✓</span> pnpm test <span className="m">·</span> 42 passed<br />
<span className="m">Waiting for your review. Nothing has been committed.</span>
            </div>
            <div className="diff" aria-hidden="true">
              <div className="h">src/cart/totals.ts  +6 −2</div>
              <div className="d">- const total = subtotal - discount</div>
              <div className="a">+ const capped = Math.min(discount, subtotal)</div>
              <div className="a">+ const total = Math.max(subtotal - capped, 0)</div>
            </div>
          </div>
          <div className="pane">
            <h4>Services</h4>
            <div className="svc"><span className="st" />web<small>pnpm dev · :3000</small></div>
            <div className="svc"><span className="st" />api<small>pnpm --filter api dev · :4000</small></div>
            <div className="svc"><span className="st o" />storybook<small>stopped</small></div>
            <div className="gitbar">
              <span className="chip blue">main</span>
              <span className="chip yellow">3 changed</span>
              <span className="chip green">↑ 0 ↓ 0</span>
              <span className="chip plain">Commit</span>
              <span className="chip plain">Push</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="features" style={{"paddingTop":"32px"}}>
  <div className="wrap">
    <div className="sec-head">
      <p className="kicker">Features</p>
      <h2>Everything around the code, nothing that replaces your editor</h2>
      <p>Dev Station orchestrates the tools you already use. Open files in Cursor or VS Code, keep your terminal habits, and leave the IDE work to the IDE.</p>
    </div>
    <div className="bento">
      <div className="card s4">
        <span className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17l6-6-6-6M12 19h8"/></svg></span>
        <h3>Real agents, real terminals</h3>
        <p>Claude Code and Cursor CLI run as actual CLI processes with a terminal attached. No custom chat UI in the way. Sessions persist per project and stay in a color-coded tab strip across the whole app.</p>
        <div className="vis pills"><span className="pill">Claude Code</span><span className="pill">Cursor CLI</span><span className="pill">Pluggable adapters</span><span className="pill">Idle and exit detection</span></div>
      </div>
      <div className="card s2">
        <span className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="8" r="2.5"/><path d="M6 8.5v7M18 10.5c0 4-6 3-12 5.5"/></svg></span>
        <h3>Git without the tab hop</h3>
        <p>Status, fetch, pull, push, commit, branch, stash. Discards always ask first.</p>
      </div>
      <div className="card s2">
        <span className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg></span>
        <h3>Detects your stack</h3>
        <p>Reads package.json, pnpm, Turbo, Nx and Docker. It never assumes <code style={{"fontFamily":"var(--mono)","fontSize":"13px","color":"var(--ink)"}}>npm run dev</code>.</p>
      </div>
      <div className="card s2">
        <span className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01"/></svg></span>
        <h3>Services per project</h3>
        <p>Start, stop and restart frontend, API, worker and database. Logs and status stay isolated per project.</p>
      </div>
      <div className="card s2">
        <span className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg></span>
        <h3>Files, not an editor</h3>
        <p>Browse and search, then open in Cursor, VS Code or reveal in your file manager.</p>
      </div>
      <div className="card s2">
        <span className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 004 0"/></svg></span>
        <h3>Quiet by design</h3>
        <p>No toasts, no notification center. Status shows as badges on the rail and in each project&apos;s activity feed.</p>
      </div>
      <div className="card s3">
        <span className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5M17 11a3 3 0 100-6M21.5 19c-.3-2.3-1.5-3.8-3.5-4.5"/></svg></span>
        <h3>Teams and permissions</h3>
        <p>Organizations with Owner, Admin, Manager, Developer and Viewer roles, backed by granular permissions instead of role checks scattered through the app.</p>
        <div className="vis list-mini">
          <div>Maya Ortiz <small>Admin</small></div>
          <div>Jonas Weber <small>Developer</small></div>
          <div>Priya Nair <small>Viewer</small></div>
        </div>
      </div>
      <div className="card s3">
        <span className="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/></svg></span>
        <h3>Secure by construction</h3>
        <p>Context isolation, no Node in the renderer, validated IPC, and every process spawned from the Electron main process only. Credentials go to the OS keychain.</p>
        <div className="vis pills"><span className="pill">Context isolation</span><span className="pill">Validated IPC</span><span className="pill">Keychain storage</span></div>
      </div>
    </div>
  </div>
</section>

<section id="workflow" style={{"paddingTop":"32px"}}>
  <div className="wrap">
    <div className="sec-head c">
      <p className="kicker">Workflow</p>
      <h2>From ticket to pushed commit</h2>
      <p>The agent does the typing. You keep the decisions. It never commits or pushes unless you configure it to.</p>
    </div>
    <div className="flow">
      <div className="step"><span className="n">01</span><h3>Pick the issue</h3><p>Browse Linear teams, projects and issues by status, priority and assignee.</p></div>
      <div className="step"><span className="n">02</span><h3>Work with AI</h3><p>One click passes the issue, plus linked Notion pages, into a new agent session.</p></div>
      <div className="step"><span className="n">03</span><h3>Agent edits locally</h3><p>It runs inside the project directory, in a terminal you can watch and interrupt.</p></div>
      <div className="step"><span className="n">04</span><h3>Review the diff</h3><p>A lightweight viewer shows exactly what changed, whether the agent or you wrote it.</p></div>
      <div className="step"><span className="n">05</span><h3>Commit and push</h3><p>Write the message, push, then switch to the next client.</p></div>
    </div>
  </div>
</section>

<section id="integrations" style={{"paddingTop":"32px"}}>
  <div className="wrap">
    <div className="sec-head">
      <p className="kicker">Integrations</p>
      <h2>Your accounts, wired in through Composio</h2>
      <p>Connect GitHub, Linear and Notion once. Add as many accounts as you need and choose which one each project uses.</p>
    </div>
    <div className="int">
      <div className="card">
        <h3>GitHub, multiple accounts</h3>
        <p>Personal, company and client accounts side by side. Clone from a connected account or paste a URL, and Dev Station inspects the repo on arrival.</p>
        <div className="acct">
          <div><span className="st" />maya-ortiz <small>Personal</small></div>
          <div><span className="st" />studio-org <small>Company</small></div>
          <div><span className="st y" />acme-corp <small>Client · needs reconnect</small></div>
        </div>
      </div>
      <div className="card">
        <h3>Linear and Notion as context</h3>
        <p>Issues stay where your team tracks them. Notion pages and databases become knowledge the agent can read.</p>
        <div style={{"marginTop":"8px"}}>
          <div className="issue"><span className="id">NB-214</span>Cart total ignores discount codes<span className="go">Work with AI</span></div>
          <div className="issue"><span className="id">NB-219</span>Add order export to CSV<span className="chip yellow">In progress</span></div>
          <div className="issue"><span className="id">NB-223</span>Checkout copy update<span className="chip plain">Todo</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section style={{"paddingTop":"32px"}}>
  <div className="wrap">
    <div className="sec-head c">
      <p className="kicker">Scope</p>
      <h2>Deliberately not another IDE</h2>
      <p>Dev Station links your tools together. It does not try to be them.</p>
    </div>
    <div className="not">
      <div className="card"><h3><s>A code editor</s></h3><p>Open any file in Cursor, VS Code or your default editor with one click.</p></div>
      <div className="card"><h3><s>A full Git client</s></h3><p>The daily commands and a diff viewer, without a second app to learn.</p></div>
      <div className="card"><h3><s>A GitHub, Linear or Notion clone</s></h3><p>Just enough of each to start work, then it gets out of the way.</p></div>
    </div>
  </div>
</section>

<section id="get" style={{"paddingTop":"32px"}}>
  <div className="wrap">
    <div className="final">
      <h2>Stop juggling windows</h2>
      <p>Create an account and bring every client project into one workspace.</p>
      <div className="cta">
        <a className="btn btn-primary btn-lg" href={signUpUrl}>Create your account</a>
        <a className="btn btn-ghost btn-lg" href="#workflow">Read the workflow</a>
      </div>
    </div>
  </div>
</section>
</main>

<footer>
  <div className="wrap">
    <div>
      <a className="logo" href="#top">
        <svg viewBox="0 0 24 24" fill="none"><rect x="1" y="1" width="22" height="22" rx="6" fill="#121212" stroke="#242728"/><path d="M6 8l4 4-4 4" stroke="#ff6161" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12.5 16H18" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
        Dev Station
      </a>
      <p className="tag">One workspace for client projects, dev services, AI agents and Git.</p>
    </div>
    <div className="cols2">
      <div><h5>Product</h5><ul><li><a href="#workspace">Workspace</a></li><li><a href="#features">Features</a></li><li><a href="#workflow">Workflow</a></li></ul></div>
      <div><h5>Integrations</h5><ul><li><a href="#integrations">GitHub</a></li><li><a href="#integrations">Linear</a></li><li><a href="#integrations">Notion</a></li></ul></div>
      <div><h5>Agents</h5><ul><li><a href="#features">Claude Code</a></li><li><a href="#features">Cursor CLI</a></li></ul></div>
    </div>
  </div>
</footer>
    </div>
  );
}
