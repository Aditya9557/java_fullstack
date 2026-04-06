"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";

// ── Intro steps data ──────────────────────────────────────────────────────────
const INTRO_STEPS = [
  {
    eyebrow: "Digital Mind-Space",
    headline: "Aditya\nChaubey",
    sub: null,
    hint: "Tap to continue",
    accent: "purple",
  },
  {
    eyebrow: "The Builder",
    headline: "Systems that understand people,\nnot just users.",
    sub: "Full-Stack Developer · AI Enthusiast · LPU",
    hint: "Tap to continue",
    accent: "blue",
  },
  {
    eyebrow: "The Thinker",
    headline: "Building at the intersection\nof technology & consciousness.",
    sub: "Where code meets philosophy — every project is a question.",
    hint: "Tap to continue",
    accent: "violet",
  },
  {
    eyebrow: "Four Worlds",
    headline: "Explore the simulation.",
    sub: "The Maker · The Mirror · The Archive · The Cosmos",
    hint: "Tap to enter",
    accent: "indigo",
  },
];

const ACCENT = {
  purple: { eyebrow: "text-purple-400/70", line: "bg-purple-600" },
  blue:   { eyebrow: "text-blue-400/70",   line: "bg-blue-600" },
  violet: { eyebrow: "text-violet-400/70", line: "bg-violet-600" },
  indigo: { eyebrow: "text-indigo-400/70", line: "bg-indigo-600" },
} as const;

// ── IntroOverlay ──────────────────────────────────────────────────────────────
function IntroOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  const handleTap = () => {
    if (exiting) return;
    if (step < INTRO_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      setExiting(true);
      setTimeout(onComplete, 900);
    }
  };

  const current = INTRO_STEPS[step];
  const colors = ACCENT[current.accent as keyof typeof ACCENT];

  return (
    <motion.div
      key="intro-overlay"
      initial={{ opacity: 1 }}
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ duration: 0.9, ease: "easeInOut" }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center cursor-pointer select-none"
      onClick={handleTap}
    >
      {/* Background subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.6) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center text-center px-8 max-w-2xl"
        >
          {/* Eyebrow */}
          <span
            className={`text-[10px] uppercase tracking-[0.5em] font-sans mb-6 ${colors.eyebrow}`}
          >
            {current.eyebrow}
          </span>

          {/* Accent line */}
          <div className={`h-px w-12 mb-8 ${colors.line}`} />

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-light text-white tracking-tight leading-[1.1] whitespace-pre-line mb-6">
            {current.headline}
          </h1>

          {/* Subtitle */}
          {current.sub && (
            <p className="text-sm md:text-base text-slate-400 tracking-wide font-light max-w-lg">
              {current.sub}
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom: step dots + tap hint */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-5">
        {/* Step indicator dots */}
        <div className="flex items-center gap-2.5">
          {INTRO_STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: i === step ? "20px" : "6px",
                height: "6px",
                background:
                  i === step
                    ? "rgba(167,139,250,0.9)"
                    : i < step
                    ? "rgba(167,139,250,0.4)"
                    : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>

        {/* Tap hint */}
        <motion.p
          key={`hint-${step}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-[10px] uppercase tracking-[0.5em] text-slate-600"
        >
          {step < INTRO_STEPS.length - 1 ? "Tap to continue" : "Tap to enter"}
        </motion.p>
      </div>
    </motion.div>
  );
}

// ── Main HUD ──────────────────────────────────────────────────────────────────
export default function ExploreHUD() {
  const focusZone = useStore((s) => s.focusZone);
  const introComplete = useStore((s) => s.introComplete);
  const setIntroComplete = useStore((s) => s.setIntroComplete);
  const [showHint, setShowHint] = useState(false);

  const handleIntroComplete = () => {
    setIntroComplete(true);
    setTimeout(() => setShowHint(true), 800);
  };

  return (
    <>
      {/* Tap-to-advance intro */}
      <AnimatePresence>
        {!introComplete && (
          <IntroOverlay key="intro" onComplete={handleIntroComplete} />
        )}
      </AnimatePresence>

      {/* Zone interaction hint */}
      <AnimatePresence>
        {showHint && !focusZone && (
          <motion.div
            key="hint"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-none text-center"
          >
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-700">
              Click a node to explore · Drag to rotate
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-left: Site identity */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: introComplete ? 1 : 0, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="fixed top-6 left-6 z-30 pointer-events-none"
      >
        <p className="text-xs font-medium tracking-widest text-white/30 uppercase">
          AC ·  Digital Mind-Space
        </p>
      </motion.div>

      {/* Top-right: Navigation back */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: introComplete ? 1 : 0, x: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="fixed top-6 right-6 z-30"
      >
        <a
          href="/"
          className="text-[10px] uppercase tracking-[0.3em] text-slate-600 hover:text-white transition-colors duration-300"
        >
          ← Exit
        </a>
      </motion.div>

      {/* Zone legend — desktop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: introComplete ? 1 : 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="fixed bottom-8 right-8 z-30 pointer-events-none hidden md:flex flex-col gap-3"
      >
        {[
          { label: "The Maker", dot: "#3b82f6" },
          { label: "The Mirror", dot: "#a78bfa" },
          { label: "The Archive", dot: "#d4a853" },
          { label: "The Cosmos", dot: "#818cf8" },
        ].map(({ label, dot }) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: dot, boxShadow: `0 0 6px ${dot}` }}
            />
            <span className="text-[10px] uppercase tracking-widest text-slate-700">
              {label}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Active zone indicator */}
      <AnimatePresence>
        {focusZone && (
          <motion.div
            key="indicator"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.4em] text-slate-700">
                Focus Mode Active
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

