import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Flame, Play, RotateCcw, SkipForward, Timer, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/ui/confetti";
import { VirtualKeyboard } from "@/components/ui/virtual-keyboard";
import { useResolvedShortcuts } from "@/features/users/hooks/use-shortcuts";
import { comboToCodes, type ResolvedShortcut } from "@/lib/shortcuts.utils";
import { cn } from "@/lib/utils";
import { useShortcutPracticeStore } from "@/stores/shortcut-practice";
import { usePracticeKeys } from "../hooks/use-practice-keys";

const ROUND_MS = 60_000;
const HINT_AFTER_MS = 5_000;
const FEEDBACK_MS = 350;
const BASE_POINTS = 10;
const STREAK_BONUS = 2;
const MAX_STREAK_BONUS_STEPS = 10;

interface Game {
  phase: "idle" | "running" | "done";
  targetId: string | null;
  score: number;
  streak: number;
  bestStreak: number;
  correct: number;
  wrong: number;
  endsAt: number;
  feedback: "ok" | "bad" | null;
  /** Bumps on every answer so the feedback animation restarts. */
  pulse: number;
}

type GameAction =
  | { type: "start"; targetId: string; endsAt: number }
  | { type: "correct"; nextId: string }
  | { type: "wrong" }
  | { type: "skip"; nextId: string }
  | { type: "clearFeedback" }
  | { type: "finish" };

const INITIAL_GAME: Game = { phase: "idle", targetId: null, score: 0, streak: 0, bestStreak: 0, correct: 0, wrong: 0, endsAt: 0, feedback: null, pulse: 0 };

function reducer(game: Game, action: GameAction): Game {
  switch (action.type) {
    case "start":
      return { ...INITIAL_GAME, phase: "running", targetId: action.targetId, endsAt: action.endsAt };
    case "correct": {
      const streak = game.streak + 1;
      const points = BASE_POINTS + Math.min(game.streak, MAX_STREAK_BONUS_STEPS) * STREAK_BONUS;
      return { ...game, targetId: action.nextId, score: game.score + points, streak, bestStreak: Math.max(game.bestStreak, streak), correct: game.correct + 1, feedback: "ok", pulse: game.pulse + 1 };
    }
    case "wrong":
      return { ...game, streak: 0, wrong: game.wrong + 1, feedback: "bad", pulse: game.pulse + 1 };
    case "skip":
      return { ...game, targetId: action.nextId, streak: 0, feedback: null, pulse: game.pulse + 1 };
    case "clearFeedback":
      return { ...game, feedback: null };
    case "finish":
      return game.phase === "running" ? { ...game, phase: "done", feedback: null } : game;
  }
}

const pickTarget = (pool: ResolvedShortcut[], excludeId: string | null): string => {
  const candidates = pool.length > 1 ? pool.filter((s) => s.id !== excludeId) : pool;
  return candidates[Math.floor(Math.random() * candidates.length)].id;
};

const formatClock = (ms: number): string => {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-surface-elevated px-3 py-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <div className="text-[0.6875rem] leading-none text-muted-foreground">{label}</div>
        <div className="mt-1 font-mono text-sm leading-none">{value}</div>
      </div>
    </div>
  );
}

/** 60-second round: a shortcut name appears, press its keys. Streaks earn bonus points; a wrong combo resets the streak. */
export function ShortcutsPracticeChallenge() {
  const shortcuts = useResolvedShortcuts();
  const pool = useMemo(() => shortcuts.filter((s) => s.combo), [shortcuts]);
  const [game, dispatch] = useReducer(reducer, INITIAL_GAME);
  const gameRef = useRef(game);
  gameRef.current = game;
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const bestScore = useShortcutPracticeStore((s) => s.best_score);
  const recordRun = useShortcutPracticeStore((s) => s.recordRun);
  const bestBeforeRun = useRef(0);
  const [newBest, setNewBest] = useState(false);

  const target = pool.find((s) => s.id === game.targetId) ?? null;
  const running = game.phase === "running";

  const pressed = usePracticeKeys(true, ({ combo, hasModifier }) => {
    const current = gameRef.current;
    if (current.phase !== "running") return;
    const currentTarget = pool.find((s) => s.id === current.targetId);
    if (!currentTarget) return;
    if (!combo) {
      setNotice(hasModifier ? "That key can't be used in a shortcut." : "Hold Ctrl/⌘ and press a key.");
      return;
    }
    setNotice(null);
    if (combo === currentTarget.combo) dispatch({ type: "correct", nextId: pickTarget(pool, current.targetId) });
    else dispatch({ type: "wrong" });
  });

  const start = () => {
    bestBeforeRun.current = useShortcutPracticeStore.getState().best_score;
    setNewBest(false);
    setNotice(null);
    setNow(Date.now());
    dispatch({ type: "start", targetId: pickTarget(pool, null), endsAt: Date.now() + ROUND_MS });
  };

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= gameRef.current.endsAt) dispatch({ type: "finish" });
    }, 200);
    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (game.phase !== "done") return;
    recordRun({ score: game.score, best_streak: game.bestStreak });
    setNewBest(game.score > 0 && game.score > bestBeforeRun.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.phase]);

  useEffect(() => {
    if (!game.feedback) return;
    const timer = setTimeout(() => dispatch({ type: "clearFeedback" }), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [game.feedback, game.pulse]);

  useEffect(() => {
    setHintVisible(false);
    if (!running) return;
    const timer = setTimeout(() => setHintVisible(true), HINT_AFTER_MS);
    return () => clearTimeout(timer);
  }, [running, game.targetId, game.pulse]);

  const hintCodes = useMemo(() => (hintVisible && target?.combo ? new Set(comboToCodes(target.combo)) : undefined), [hintVisible, target]);
  const timeLeft = running ? game.endsAt - now : 0;
  const attempts = game.correct + game.wrong;
  const accuracy = attempts ? Math.round((game.correct / attempts) * 100) : 0;

  if (pool.length < 2) {
    return <div className="rounded-md border border-dashed px-4 py-8 text-center text-[0.8125rem] text-muted-foreground">You need at least two shortcuts to play the challenge.</div>;
  }

  return (
    <div className="relative flex flex-col gap-4">
      {game.phase === "done" && newBest && <Confetti />}

      {game.phase === "idle" && (
        <div className="flex flex-col items-center gap-3 rounded-md border bg-surface-elevated px-4 py-8 text-center">
          <div className="text-sm font-medium">Beat the clock</div>
          <p className="max-w-sm text-[0.8125rem] text-muted-foreground">
            A shortcut name appears. Press its keys as fast as you can. Streaks earn bonus points, a wrong combo resets yours. You have one minute.
          </p>
          {bestScore > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Trophy className="size-3.5" /> Best score: {bestScore}
            </div>
          )}
          <Button onClick={start} className="gap-2" autoFocus>
            <Play className="size-4" /> Start
          </Button>
        </div>
      )}

      {running && target && (
        <>
          <div className="flex items-center gap-2">
            <Stat icon={<Trophy className="size-4" />} label="Score" value={game.score} />
            <Stat icon={<Flame className="size-4" />} label="Streak" value={game.streak} />
            <Stat icon={<Timer className="size-4" />} label="Time" value={formatClock(timeLeft)} />
            <Button variant="ghost" size="sm" className="ml-auto gap-1.5" onClick={() => dispatch({ type: "skip", nextId: pickTarget(pool, game.targetId) })}>
              <SkipForward className="size-4" /> Skip
            </Button>
          </div>
          <div
            key={game.pulse}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border bg-surface-elevated px-4 py-6 text-center transition-colors",
              game.feedback === "ok" && "border-success bg-success-soft",
              game.feedback === "bad" && "animate-shortcut-shake border-danger bg-danger-soft",
            )}
            aria-live="polite"
          >
            <div className="text-xs text-muted-foreground">Press the shortcut for</div>
            <div className="text-lg font-medium">{target.label}</div>
            <div className="h-4 text-xs text-muted-foreground">{notice}</div>
          </div>
        </>
      )}

      {game.phase === "done" && (
        <div className="flex flex-col items-center gap-3 rounded-md border bg-surface-elevated px-4 py-8 text-center">
          <div className="text-xs text-muted-foreground">{newBest ? "New best score!" : "Time's up"}</div>
          <div className="font-mono text-3xl">{game.score}</div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>{game.correct} correct</span>
            <span>{accuracy}% accuracy</span>
            <span>Best streak {game.bestStreak}</span>
          </div>
          <Button onClick={start} className="gap-2">
            <RotateCcw className="size-4" /> Play again
          </Button>
        </div>
      )}

      <VirtualKeyboard pressedCodes={pressed} hintCodes={hintCodes} />
    </div>
  );
}
