"use client";

import { useEffect, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import {
    Activity,
    ArrowLeft,
    ArrowRight,
    Bell,
    Check,
    CircleCheck,
    Files,
    GitBranch,
    GitCommitHorizontal,
    Globe,
    GripVertical,
    History,
    Home,
    LayoutGrid,
    LayoutPanelLeft,
    PanelRight,
    Play,
    Plug,
    Plus,
    RotateCcw,
    RotateCw,
    Search,
    Settings,
    Square,
} from "lucide-react";
import { AppLogo } from "@/components/layout/app-logo";
import { IDENTICON_GRID, identiconCells } from "@/lib/identicon";
import { INITIAL_SESSIONS, PROJECTS, TABS, type DemoProject, type DemoSession, type TabId } from "./app-preview-data";

/**
 * Interactive, trimmed-down replica of the desktop workspace shell in `app/` (top bar · project rail |
 * project tab dock | AI panel · status bar). Mirrors the real layout, tokens and labels; keep it in
 * step with app/src/pages/workspace when the shell changes.
 */

type Side = "left" | "right" | "top" | "bottom";
type PaneZone = "left" | "right" | "center";
interface TabGroup {
    id: string;
    tabs: TabId[];
    active: TabId;
}
type Drag = { kind: "tab"; tab: TabId; from: string } | { kind: "ai" };
type Drop = { kind: "strip"; group: string; index: number } | { kind: "pane"; group: string; zone: PaneZone } | { kind: "dock"; side: Side };

const TAB_META: Record<TabId, { label: string; Icon: typeof Home }> = {
    overview: { label: "Overview", Icon: Home },
    git: { label: "Git", Icon: GitBranch },
    files: { label: "Files", Icon: Files },
    preview: { label: "Preview", Icon: Globe },
};

const SIDES: Side[] = ["left", "right", "top", "bottom"];
const SIDE_LABEL: Record<Side, string> = { left: "Left", right: "Right", top: "Top", bottom: "Bottom" };
const INITIAL_GROUPS: TabGroup[] = [{ id: "g1", tabs: [...TABS], active: "preview" }];
const AI_DEFAULT = { h: 380, v: 220 };
const AI_MIN = { h: 260, v: 130 };
const AI_MAX_W = 560;
const MAIN_MIN = 240;
/** How long a "working" agent takes to finish in the demo. */
const WORK_MS = 6000;

const isVertical = (side: Side) => side === "top" || side === "bottom";
const clamp = (v: number, min: number, max: number) => Math.round(Math.max(min, Math.min(max, v)));
const clock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
const projectOf = (id: string) => PROJECTS.find((p) => p.id === id)!;

/** Same artwork as the app's ProjectAvatar with an `avatar_seed`: a mirrored 5×5 identicon on the project color. */
function ProjectAvatar({ project, size }: { project: DemoProject; size: "sm" | "lg" }) {
    return (
        <span className={`ds-av ${size}`} style={{ background: project.color }} aria-hidden="true">
            <svg viewBox={`0 0 ${IDENTICON_GRID} ${IDENTICON_GRID}`} shapeRendering="crispEdges">
                {identiconCells(project.seed).map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />)}
            </svg>
        </span>
    );
}

/** Tracks a pointer drag on window until release — used by every resize handle. */
function trackPointer(onMove: (ev: PointerEvent) => void, onEnd: () => void) {
    const up = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", up);
        onEnd();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", up);
}

/** Moves `tab` out of its group and into `to` at `index` (or into a new group beside `to`); empty groups disappear. */
function placeTab(groups: TabGroup[], tab: TabId, from: string, to: string, index: number | null, splitSide?: "left" | "right"): TabGroup[] {
    const gs = groups.map((g) => ({ ...g, tabs: [...g.tabs] }));
    const src = gs.find((g) => g.id === from);
    const dst = gs.find((g) => g.id === to);
    if (!src || !dst) return groups;
    const srcIdx = src.tabs.indexOf(tab);
    src.tabs.splice(srcIdx, 1);
    if (src.active === tab) src.active = src.tabs[Math.max(0, srcIdx - 1)];

    if (splitSide) {
        const at = gs.indexOf(dst) + (splitSide === "right" ? 1 : 0);
        gs.splice(at, 0, { id: `g${Date.now()}`, tabs: [tab], active: tab });
    } else {
        let at = index ?? dst.tabs.length;
        if (src === dst && srcIdx < at) at--;
        dst.tabs.splice(Math.min(at, dst.tabs.length), 0, tab);
        dst.active = tab;
    }
    return gs.filter((g) => g.tabs.length > 0);
}

export function AppPreview() {
    const rootRef = useRef<HTMLDivElement>(null);
    const dockRef = useRef<HTMLDivElement>(null);
    const groupsRef = useRef<HTMLDivElement>(null);
    const layoutMenuRef = useRef<HTMLDivElement>(null);
    const lastSessionByProject = useRef<Record<string, string>>({});
    const [inView, setInView] = useState(false);
    const [activeProjectId, setActiveProjectId] = useState<string | null>("storefront");
    const [sessions, setSessions] = useState<DemoSession[]>(INITIAL_SESSIONS);
    const [activeSessionId, setActiveSessionId] = useState("s-discount");
    const [services, setServices] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(PROJECTS.flatMap((p) => p.services.map((s) => [`${p.id}:${s.name}`, s.running]))),
    );
    const [activity, setActivity] = useState("14:32 · Session ‘Discount codes’ finished");

    // Layout: project tab groups, AI panel + sidebar placement, panel sizes.
    const [groups, setGroups] = useState<TabGroup[]>(INITIAL_GROUPS);
    const [split, setSplit] = useState(0.5);
    const [aiOpen, setAiOpen] = useState(true);
    const [aiSide, setAiSide] = useState<Side>("right");
    const [railSide, setRailSide] = useState<Side>("left");
    const [aiSize, setAiSize] = useState(AI_DEFAULT);
    const [resizing, setResizing] = useState<"h" | "v" | null>(null);
    const [drag, setDrag] = useState<Drag | null>(null);
    const [drop, setDrop] = useState<Drop | null>(null);
    const [layoutOpen, setLayoutOpen] = useState(false);

    // Agents only make progress while the mockup is on screen.
    useEffect(() => {
        const el = rootRef.current;
        if (!el) return;
        const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.3 });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    // Working sessions finish after a short while and land in review.
    const working = sessions.filter((s) => s.state === "working").map((s) => s.id).join(",");
    useEffect(() => {
        if (!inView || !working) return;
        const timer = setTimeout(() => {
            const ids = working.split(",");
            setSessions((prev) => prev.map((s) => (ids.includes(s.id) && s.state === "working" ? { ...s, state: "review" } : s)));
            const first = INITIAL_SESSIONS.find((s) => s.id === ids[0]);
            if (first) setActivity(`${clock()} · Session ‘${first.name}’ finished`);
        }, WORK_MS);
        return () => clearTimeout(timer);
    }, [inView, working]);

    useEffect(() => {
        if (!layoutOpen) return;
        const close = (e: MouseEvent) => {
            if (!layoutMenuRef.current?.contains(e.target as Node)) setLayoutOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [layoutOpen]);

    const project = activeProjectId ? projectOf(activeProjectId) : null;
    const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
    const reviewCount = sessions.filter((s) => s.state === "review").length;
    const agentsActive = sessions.filter((s) => s.state === "working" || s.state === "input").length;
    const processes = Object.values(services).filter(Boolean).length;
    const isRunning = (p: DemoProject, name: string) => services[`${p.id}:${name}`];
    const pending = (projectId: string) => sessions.filter((s) => s.projectId === projectId && (s.state === "review" || s.state === "working"));
    const changedCount = project ? pending(project.id).reduce((n, s) => n + s.changes.length, 0) : 0;

    const selectSession = (s: DemoSession) => {
        lastSessionByProject.current[s.projectId] = s.id;
        setActiveSessionId(s.id);
        setActiveProjectId(s.projectId);
    };

    const selectProject = (id: string) => {
        setActiveProjectId(id);
        const remembered = lastSessionByProject.current[id];
        const s = sessions.find((x) => x.id === remembered) ?? sessions.find((x) => x.projectId === id);
        if (s) setActiveSessionId(s.id);
    };

    const updateSession = (id: string, patch: Partial<DemoSession>) =>
        setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

    const commit = (s: DemoSession) => {
        updateSession(s.id, { state: "committed" });
        setActivity(`${clock()} · Committed ${s.sha} on ${projectOf(s.projectId).name}`);
    };

    const nextReview = () => {
        const next = sessions.find((s) => s.state === "review");
        if (next) selectSession(next);
    };

    const toggleService = (p: DemoProject, name: string) =>
        setServices((prev) => ({ ...prev, [`${p.id}:${name}`]: !prev[`${p.id}:${name}`] }));

    const resetLayout = () => {
        setGroups(INITIAL_GROUPS);
        setSplit(0.5);
        setAiSide("right");
        setRailSide("left");
        setAiSize(AI_DEFAULT);
        setAiOpen(true);
        setLayoutOpen(false);
    };

    // ── Resizing ────────────────────────────────────────────────────────────
    const startAiResize = (e: ReactPointerEvent) => {
        const dock = dockRef.current?.getBoundingClientRect();
        if (!dock) return;
        e.preventDefault();
        const vertical = isVertical(aiSide);
        setResizing(vertical ? "v" : "h");
        trackPointer(
            (ev) => {
                if (vertical) {
                    const size = aiSide === "bottom" ? dock.bottom - ev.clientY : ev.clientY - dock.top;
                    setAiSize((s) => ({ ...s, v: clamp(size, AI_MIN.v, dock.height - 140) }));
                } else {
                    const size = aiSide === "right" ? dock.right - ev.clientX : ev.clientX - dock.left;
                    setAiSize((s) => ({ ...s, h: clamp(size, AI_MIN.h, Math.min(AI_MAX_W, dock.width - MAIN_MIN)) }));
                }
            },
            () => setResizing(null),
        );
    };

    const startGroupResize = (e: ReactPointerEvent) => {
        const rect = groupsRef.current?.getBoundingClientRect();
        if (!rect) return;
        e.preventDefault();
        setResizing("h");
        trackPointer(
            (ev) => setSplit(Math.max(0.25, Math.min(0.75, (ev.clientX - rect.left) / rect.width))),
            () => setResizing(null),
        );
    };

    // ── Drag & drop (tabs between groups / splits, AI panel between edges) ─
    const beginDrag = (e: DragEvent, next: Drag) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", next.kind === "tab" ? next.tab : "ai-panel");
        // Defer the re-render: changing the DOM inside dragstart makes Chrome cancel the drag.
        setTimeout(() => setDrag(next), 0);
    };
    const endDrag = () => {
        setDrag(null);
        setDrop(null);
    };

    const overTab = (e: DragEvent<HTMLElement>, group: string, index: number) => {
        if (drag?.kind !== "tab") return;
        e.preventDefault();
        e.stopPropagation();
        const r = e.currentTarget.getBoundingClientRect();
        setDrop({ kind: "strip", group, index: e.clientX < r.left + r.width / 2 ? index : index + 1 });
    };

    const overStripEnd = (e: DragEvent<HTMLElement>, group: TabGroup) => {
        if (drag?.kind !== "tab") return;
        e.preventDefault();
        setDrop({ kind: "strip", group: group.id, index: group.tabs.length });
    };

    const overPane = (e: DragEvent<HTMLElement>, group: TabGroup) => {
        if (drag?.kind !== "tab") return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        // One split at a time, and a group can't be split by its only tab.
        const canSplit = groups.length < 2 && !(drag.from === group.id && group.tabs.length === 1);
        const zone: PaneZone = canSplit && x < 0.3 ? "left" : canSplit && x > 0.7 ? "right" : "center";
        setDrop({ kind: "pane", group: group.id, zone });
    };

    const overDock = (e: DragEvent<HTMLElement>) => {
        if (drag?.kind !== "ai") return;
        e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        const dist: [Side, number][] = [["left", x], ["right", 1 - x], ["top", y], ["bottom", 1 - y]];
        setDrop({ kind: "dock", side: dist.sort((a, b) => a[1] - b[1])[0][0] });
    };

    const applyDrop = (e: DragEvent) => {
        e.preventDefault();
        if (drag?.kind === "tab" && drop?.kind === "strip") setGroups((g) => placeTab(g, drag.tab, drag.from, drop.group, drop.index));
        if (drag?.kind === "tab" && drop?.kind === "pane") {
            setGroups((g) => placeTab(g, drag.tab, drag.from, drop.group, null, drop.zone === "center" ? undefined : drop.zone));
            if (drop.zone !== "center") setSplit(0.5);
        }
        if (drag?.kind === "ai" && drop?.kind === "dock") setAiSide(drop.side);
        endDrag();
    };

    const setGroupActive = (id: string, tab: TabId) => setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, active: tab } : g)));

    const renderTab = (tab: TabId) => {
        switch (tab) {
            case "overview":
                return (
                    <OverviewView
                        project={project!}
                        sessions={sessions.filter((s) => s.projectId === project!.id)}
                        isRunning={(n) => isRunning(project!, n)}
                        onToggle={(n) => toggleService(project!, n)}
                        onOpenSession={selectSession}
                    />
                );
            case "git":
                return <GitView project={project!} pending={pending(project!.id)} committed={sessions.filter((s) => s.projectId === project!.id && s.state === "committed")} />;
            case "files":
                return <FilesView project={project!} />;
            case "preview":
                return (
                    <PreviewView
                        project={project!}
                        running={project!.services.some((s) => s.port && isRunning(project!, s.name))}
                        onStart={() => toggleService(project!, project!.services[0].name)}
                    />
                );
        }
    };

    const sessionGroups = PROJECTS.map((p) => ({ project: p, sessions: sessions.filter((s) => s.projectId === p.id) })).filter((g) => g.sessions.length);
    const railHorizontal = isVertical(railSide);

    return (
        <div ref={rootRef} className={`ds${resizing ? ` is-resizing-${resizing}` : ""}${drag ? " is-dragging" : ""}`} aria-label="Interactive preview of the Dev Station workspace">
            <div className="ds-top">
                <button className="ds-brand" onClick={() => setActiveProjectId(null)} aria-label="Workspace home"><AppLogo />Dev Station</button>
                <span className="ds-nav"><ArrowLeft /><ArrowRight /></span>
                {project && (
                    <span className="ds-identity">
                        <ProjectAvatar project={project} size="sm" />
                        <b>{project.name}</b>
                        <small>{project.repo}</small>
                    </span>
                )}
                <span className="ds-search"><Search /><span>Search projects, issues…</span><kbd>Ctrl</kbd><kbd>K</kbd></span>
                <span className="ds-icons">
                    <div className="ds-menu-wrap" ref={layoutMenuRef}>
                        <button className={`ds-ibtn${layoutOpen ? " on" : ""}`} onClick={() => setLayoutOpen((v) => !v)} aria-label="Layout" aria-expanded={layoutOpen}><LayoutPanelLeft /></button>
                        {layoutOpen && (
                            <div className="ds-menu" role="menu">
                                <p className="ds-menu-label">AI panel position</p>
                                <div className="ds-seg-ctl">
                                    {SIDES.map((s) => (
                                        <button key={s} className={aiSide === s ? "on" : undefined} onClick={() => { setAiSide(s); setAiOpen(true); }}>{SIDE_LABEL[s]}</button>
                                    ))}
                                </div>
                                <p className="ds-menu-label">Sidebar position</p>
                                <div className="ds-seg-ctl">
                                    {SIDES.map((s) => (
                                        <button key={s} className={railSide === s ? "on" : undefined} onClick={() => setRailSide(s)}>{SIDE_LABEL[s]}</button>
                                    ))}
                                </div>
                                <div className="ds-menu-sep" />
                                <button className="ds-menu-item" onClick={resetLayout}><RotateCcw />Reset layout</button>
                            </div>
                        )}
                    </div>
                    <button className={`ds-ibtn${aiOpen ? " on" : ""}`} onClick={() => setAiOpen((v) => !v)} aria-label="Toggle AI panel" aria-pressed={aiOpen}><PanelRight /></button>
                    <span className="ds-me">MO</span>
                </span>
            </div>

            <div className={`ds-body rail-${railSide}`}>
                <div className={`ds-rail${railHorizontal ? " h" : ""}`}>
                    <button className={`ds-rbtn${project ? "" : " on"}`} onClick={() => setActiveProjectId(null)} aria-label="Home"><LayoutGrid /></button>
                    <span className="ds-rsep" />
                    {PROJECTS.map((p) => {
                        const attention = sessions.filter((s) => s.projectId === p.id && (s.state === "review" || s.state === "input")).length;
                        return (
                            <span key={p.id} className={`ds-ritem${p.id === activeProjectId ? " on" : ""}`}>
                                <button className="ds-ravatar" onClick={() => selectProject(p.id)} aria-label={p.name} aria-current={p.id === activeProjectId ? "page" : undefined}>
                                    <ProjectAvatar project={p} size="lg" />
                                </button>
                                {attention > 0 && <span className="ds-badge">{attention}</span>}
                            </span>
                        );
                    })}
                    <span className="ds-radd"><Plus /></span>
                    <span className="ds-rfoot">
                        <span className="ds-rsep" />
                        <span className="ds-rbtn"><Plug /></span>
                        <span className="ds-rbtn"><Settings /></span>
                    </span>
                </div>

                <div
                    ref={dockRef}
                    className={`ds-dock ai-${aiSide}${aiOpen ? "" : " ai-closed"}`}
                    style={{ "--ai-w": `${aiSize.h}px`, "--ai-h": `${aiSize.v}px` } as CSSProperties}
                >
                    <div className="ds-main">
                        {project ? (
                            <div className="ds-groups" ref={groupsRef}>
                                {groups.map((group, gi) => (
                                    <div key={group.id} className="ds-group" style={groups.length > 1 ? { flexBasis: `${(gi === 0 ? split : 1 - split) * 100}%` } : undefined}>
                                        {gi > 0 && <div className="ds-handle group" onPointerDown={startGroupResize} onDoubleClick={() => setSplit(0.5)} role="separator" aria-orientation="vertical" aria-label="Resize panels" />}
                                        <div className="ds-tabs" role="tablist" onDragOver={(e) => overStripEnd(e, group)} onDrop={applyDrop}>
                                            {group.tabs.map((id, i) => {
                                                const { label, Icon } = TAB_META[id];
                                                const showMarker = drop?.kind === "strip" && drop.group === group.id && drop.index === i;
                                                return (
                                                    <button
                                                        key={id}
                                                        role="tab"
                                                        aria-selected={group.active === id}
                                                        className={`ds-tab${group.active === id ? " on" : ""}${showMarker ? " drop-before" : ""}${drag?.kind === "tab" && drag.tab === id ? " dragging" : ""}`}
                                                        onClick={() => setGroupActive(group.id, id)}
                                                        draggable
                                                        onDragStart={(e) => beginDrag(e, { kind: "tab", tab: id, from: group.id })}
                                                        onDragEnd={endDrag}
                                                        onDragOver={(e) => overTab(e, group.id, i)}
                                                    >
                                                        <Icon />{label}
                                                    </button>
                                                );
                                            })}
                                            <span className={`ds-tab-end${drop?.kind === "strip" && drop.group === group.id && drop.index === group.tabs.length ? " drop-before" : ""}`} />
                                            {gi === groups.length - 1 && <span className="ds-tab-add"><Plus /></span>}
                                        </div>
                                        <div className="ds-view">
                                            {renderTab(group.active)}
                                            {drag?.kind === "tab" && (
                                                <div className="ds-drop-pane" onDragOver={(e) => overPane(e, group)} onDragLeave={() => setDrop(null)} onDrop={applyDrop}>
                                                    {drop?.kind === "pane" && drop.group === group.id && <span className={`ds-drop-hl ${drop.zone}`} />}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <HomeView sessions={sessions} onOpen={selectProject} />
                        )}
                    </div>

                    {aiOpen && (
                        <div className="ds-ai">
                            <div className="ds-handle ai" onPointerDown={startAiResize} onDoubleClick={() => setAiSize(AI_DEFAULT)} role="separator" aria-label="Resize AI panel" />
                            <div className="ds-ai-h" draggable onDragStart={(e) => beginDrag(e, { kind: "ai" })} onDragEnd={endDrag} title="Drag to move the AI panel">
                                <GripVertical className="ds-grip" />
                                {reviewCount > 0 ? (
                                    <button className="ds-review" onClick={nextReview}><CircleCheck />Needs review<b>{reviewCount}</b></button>
                                ) : (
                                    <span className="ds-ai-label">AI sessions</span>
                                )}
                                <History className="ds-ai-ico" />
                            </div>
                            <div className="ds-sessions">
                                {sessionGroups.map(({ project: p, sessions: list }) => (
                                    <span key={p.id} className="ds-seg">
                                        <span className={`ds-seg-label${p.id === activeProjectId ? " on" : ""}`}>
                                            <i className="ds-flag" style={{ background: p.color }} />{p.name}
                                        </span>
                                        {list.map((s) => (
                                            <button key={s.id} className={`ds-stab ${s.state}${s.id === activeSession.id ? " on" : ""}`} onClick={() => selectSession(s)}>
                                                {s.state === "committed" ? <Check className="ds-done" /> : <i className={`ds-dot ${s.state}`} />}
                                                <span>{s.name}</span>
                                            </button>
                                        ))}
                                    </span>
                                ))}
                            </div>
                            <Terminal session={activeSession} onAnswer={(a) => updateSession(activeSession.id, { state: "working", answer: a })} />
                            {(activeSession.state === "review" || activeSession.state === "committed") && (
                                <ReviewBar session={activeSession} reviewCount={reviewCount} onCommit={() => commit(activeSession)} onNext={nextReview} />
                            )}
                        </div>
                    )}

                    {drag?.kind === "ai" && (
                        <div className="ds-drop-dock" onDragOver={overDock} onDragLeave={() => setDrop(null)} onDrop={applyDrop}>
                            {drop?.kind === "dock" && <span className={`ds-drop-hl ${drop.side}`}>AI panel · {SIDE_LABEL[drop.side]}</span>}
                        </div>
                    )}
                </div>
            </div>

            <div className="ds-status">
                <span><Activity />{processes} processes running {agentsActive > 0 && <em>· {agentsActive} agent{agentsActive > 1 ? "s" : ""} active</em>}</span>
                {project && (
                    <span className="ds-st-git">
                        <GitBranch /><code>{project.branch}</code>{changedCount > 0 && <em className="warn">· {changedCount} changed</em>}
                    </span>
                )}
                <span className="ds-st-act"><Bell />{activity}</span>
                <span className="ds-st-ver">Dev Station</span>
            </div>
        </div>
    );
}

function Terminal({ session, onAnswer }: { session: DemoSession; onAnswer: (answer: string) => void }) {
    const { state, steps, question, answer } = session;
    const shown = state === "input" ? steps.slice(0, 1) : state === "working" ? steps.slice(0, -1) : steps;
    const [first, ...rest] = shown;
    const step = ([verb, target, note]: DemoSession["steps"][number]) => (
        <div key={verb + target}>
            <span className="g">●</span> {verb} <span className="w">{target}</span>{note && <span className="m"> · {note}</span>}
        </div>
    );

    return (
        <div className="ds-term">
            <div><span className="o">●</span> <span className="w">{session.agent}</span> <span className="m">· {projectOf(session.projectId).name.toLowerCase()}</span></div>
            <div className="gap"><span className="m">&gt;</span> <span className="w">{session.prompt}</span></div>
            {first && step(first)}
            {question && (
                <div className="gap">
                    <span className="y">?</span> <span className="w">{question.text}</span>
                    {state === "input" ? (
                        <div className="ds-opts">
                            {question.options.map((o, i) => (
                                <button key={o} onClick={() => onAnswer(o)}><span className="m">{i + 1}.</span> {o}</button>
                            ))}
                        </div>
                    ) : (
                        answer && <div><span className="m">&gt;</span> <span className="w">{answer}</span></div>
                    )}
                </div>
            )}
            {rest.map(step)}
            {state === "working" && <div className="gap"><span className="ds-spin">✻</span> Working… <span className="m">(esc to interrupt)</span></div>}
            {(state === "review" || state === "committed") && (
                <div className="gap"><span className="w">{session.summary}</span>{state === "review" && <span className="caret" />}</div>
            )}
        </div>
    );
}

function ReviewBar({ session, reviewCount, onCommit, onNext }: { session: DemoSession; reviewCount: number; onCommit: () => void; onNext: () => void }) {
    const add = session.changes.reduce((n, c) => n + c.add, 0);
    const del = session.changes.reduce((n, c) => n + c.del, 0);

    if (session.state === "committed") {
        return (
            <div className="ds-rbar">
                <div className="ds-rrow">
                    <Check className="ok" />Committed <code className="sha">{session.sha}</code>
                    {reviewCount > 0 && <button className="ds-cbtn push" onClick={onNext}>Next review ({reviewCount}) <ArrowRight /></button>}
                </div>
            </div>
        );
    }
    return (
        <div className="ds-rbar">
            <div className="ds-rrow">
                <span>{session.changes.length} file{session.changes.length > 1 ? "s" : ""} changed</span>
                <span className="add">+{add}</span><span className="del">−{del}</span>
                <span className="ds-mark">Mark reviewed</span>
            </div>
            <div className="ds-rrow">
                <span className="ds-commit">{session.name}</span>
                <button className="ds-cbtn" onClick={onCommit}><GitCommitHorizontal />Commit</button>
            </div>
        </div>
    );
}

function HomeView({ sessions, onOpen }: { sessions: DemoSession[]; onOpen: (id: string) => void }) {
    return (
        <div className="ds-view ds-pad">
            <p className="ds-h">Projects</p>
            <div className="ds-home-grid">
                {PROJECTS.map((p) => {
                    const live = sessions.find((s) => s.projectId === p.id && s.state !== "committed");
                    return (
                        <button key={p.id} className="ds-pcard" onClick={() => onOpen(p.id)}>
                            <ProjectAvatar project={p} size="sm" />
                            <span className="ds-pcard-main"><b>{p.name}</b><small>{p.repo}</small></span>
                            <i className={`ds-dot ${live ? live.state : "idle"}`} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

interface OverviewViewProps {
    project: DemoProject;
    sessions: DemoSession[];
    isRunning: (name: string) => boolean;
    onToggle: (name: string) => void;
    onOpenSession: (s: DemoSession) => void;
}

function OverviewView({ project, sessions, isRunning, onToggle, onOpenSession }: OverviewViewProps) {
    return (
        <div className="ds-pad">
            <div className="ds-repo"><GitBranch /><code>{project.branch}</code><span className="m">{project.repo}</span></div>
            <p className="ds-h">Services</p>
            <div className="ds-list">
                {project.services.map((s) => {
                    const on = isRunning(s.name);
                    return (
                        <div key={s.name} className="ds-row">
                            <i className={`ds-dot ${on ? "working" : "idle"}`} />
                            <b>{s.name}</b>
                            <code>{s.cmd}{on && s.port ? ` · :${s.port}` : ""}</code>
                            <button className="ds-mini" onClick={() => onToggle(s.name)} aria-label={`${on ? "Stop" : "Start"} ${s.name}`}>{on ? <Square /> : <Play />}</button>
                        </div>
                    );
                })}
            </div>
            <p className="ds-h">AI sessions</p>
            <div className="ds-list">
                {sessions.length === 0 && <div className="ds-row muted">No sessions yet</div>}
                {sessions.map((s) => (
                    <button key={s.id} className="ds-row" onClick={() => onOpenSession(s)}>
                        {s.state === "committed" ? <Check className="ds-done" /> : <i className={`ds-dot ${s.state}`} />}
                        <b>{s.name}</b><code>{s.agent}</code>
                    </button>
                ))}
            </div>
        </div>
    );
}

function GitView({ project, pending, committed }: { project: DemoProject; pending: DemoSession[]; committed: DemoSession[] }) {
    const changes = pending.flatMap((s) => s.changes);
    const diff = pending[0]?.diff ?? [];
    return (
        <div className="ds-pad">
            <div className="ds-repo"><GitBranch /><code>{project.branch}</code>{changes.length > 0 && <span className="chip yellow">{changes.length} changed</span>}</div>
            {changes.length === 0 ? (
                <div className="ds-clean"><Check />Working tree clean</div>
            ) : (
                <>
                    <div className="ds-list">
                        {changes.map((c, i) => (
                            <div key={c.path} className={`ds-row file${i === 0 ? " on" : ""}`}>
                                <span className={`fs ${c.status === "A" ? "a" : "m"}`}>{c.status}</span>
                                <code>{c.path}</code>
                                <small><span className="add">+{c.add}</span> <span className="del">−{c.del}</span></small>
                            </div>
                        ))}
                    </div>
                    <div className="diff">
                        <div className="h">{changes[0].path}</div>
                        {diff.map((l) => <div key={l.text} className={l.kind}>{l.text}</div>)}
                    </div>
                </>
            )}
            {committed.length > 0 && (
                <>
                    <p className="ds-h">Recent commits</p>
                    <div className="ds-list">
                        {committed.map((s) => <div key={s.id} className="ds-row"><code className="sha">{s.sha}</code><b>{s.name}</b></div>)}
                    </div>
                </>
            )}
        </div>
    );
}

const CODE_LINES = [72, 48, 0, 84, 62, 90, 40, 0, 56, 30];

function FilesView({ project }: { project: DemoProject }) {
    return (
        <div className="ds-files">
            <div className="ds-tree">
                {project.files.map((f, i) => {
                    const dir = /^[▾▸]/.test(f.trim());
                    return <div key={f + i} className={dir ? "dir" : i === 2 ? "on" : undefined}>{f}</div>;
                })}
            </div>
            <div className="ds-editor" aria-hidden="true">
                {CODE_LINES.map((w, i) => (
                    <div key={i}><em>{i + 1}</em><span style={{ width: `${w}%` }} /></div>
                ))}
            </div>
        </div>
    );
}

function PreviewView({ project, running, onStart }: { project: DemoProject; running: boolean; onStart: () => void }) {
    return (
        <div className="ds-preview">
            <div className="ds-ptool">
                <ArrowLeft /><ArrowRight /><RotateCw />
                <span className="ds-url">{running ? project.url : ""}</span>
            </div>
            {running ? (
                project.site
            ) : (
                <div className="ds-empty">
                    <Globe />
                    <b>No service with a URL is running</b>
                    <button className="ds-cbtn" onClick={onStart}><Play />Start service</button>
                </div>
            )}
        </div>
    );
}
