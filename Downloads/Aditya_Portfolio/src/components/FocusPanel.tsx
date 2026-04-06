"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useStore, type ZoneId } from "@/lib/store";
import { X, ArrowLeft, Globe, BookOpen, Feather, Cpu, Download, FileText, ExternalLink } from "lucide-react";
import {
  projects,
  skills,
  experiences,
  poems,
  pranamWritings,
  philosophyTopics,
  greatMinds,
  cosmosTopics,
} from "@/lib/data";

// ─── Sub-panels ──────────────────────────────────────────────────────────────

function MakerPanel() {
  return (
    <div className="space-y-16">
      {/* Header */}
      <div>
        <span className="text-xs uppercase tracking-[0.3em] text-blue-400/70 font-sans">
          Professional
        </span>
        <h2 className="text-5xl md:text-6xl font-bold text-white mt-3 tracking-tight">
          The Maker
        </h2>
        <p className="text-slate-400 mt-4 text-lg font-light max-w-xl">
          Building systems that reduce friction and create belonging. Every line of code is a design decision.
        </p>
        <div className="h-px w-20 bg-blue-600 mt-6" />
      </div>

      {/* Projects */}
      <section>
        <h3 className="text-xs uppercase tracking-[0.25em] text-blue-400/60 mb-8">Selected Work</h3>
        <div className="space-y-6">
          {projects.map((p) => (
            <div
              key={p.title}
              className="group border border-white/5 bg-white/[0.02] hover:bg-blue-500/5 hover:border-blue-500/20 rounded-2xl p-8 transition-all duration-400"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h4 className="text-2xl font-semibold text-white">{p.title}</h4>
                  <p className="text-blue-400/60 text-sm mt-1">{p.subtitle}</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                  {p.techStack.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] uppercase tracking-wider border border-blue-500/20 text-blue-300/60 px-3 py-1 rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-6">
                {[
                  { label: "Problem", text: p.problem },
                  { label: "Solution", text: p.solution },
                  { label: "Outcome", text: p.outcome },
                ].map(({ label, text }) => (
                  <div key={label}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600 mb-2">{label}</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 pt-5 flex items-start justify-between gap-4">
                <p className="text-slate-500 text-sm italic flex-1">
                  &ldquo;{p.thought}&rdquo;
                </p>
                {p.liveUrl && (
                  <a
                    href={p.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/50 text-blue-300 text-xs tracking-wider transition-all duration-300 group/link"
                  >
                    <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                    Live Demo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Skills */}
      <section>
        <h3 className="text-xs uppercase tracking-[0.25em] text-blue-400/60 mb-8">Capabilities</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {skills.map((s) => (
            <div
              key={s.category}
              className="border border-white/5 bg-white/[0.02] rounded-xl p-5"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-blue-400/50 mb-3">{s.category}</p>
              <div className="flex flex-wrap gap-2">
                {s.items.map((item) => (
                  <span key={item} className="text-xs text-slate-300 bg-white/5 rounded-md px-2 py-1">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section>
        <h3 className="text-xs uppercase tracking-[0.25em] text-blue-400/60 mb-8">Experience</h3>
        <div className="space-y-6">
          {experiences.map((e) => (
            <div key={e.role} className="flex gap-6 border border-white/5 bg-white/[0.02] rounded-xl p-6">
              <div className="w-1 bg-blue-600/40 rounded-full flex-shrink-0" />
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="text-white font-medium">{e.role}</h4>
                  <span className="text-xs text-slate-600">·</span>
                  <span className="text-xs text-slate-500">{e.duration}</span>
                </div>
                <p className="text-blue-400/60 text-sm mb-4">{e.company} — {e.location}</p>
                <ul className="space-y-2">
                  {e.bullets.map((b) => (
                    <li key={b} className="text-slate-400 text-sm flex items-start gap-2">
                      <span className="text-blue-500/60 mt-1 flex-shrink-0">›</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Resume / CV */}
      <section>
        <h3 className="text-xs uppercase tracking-[0.25em] text-blue-400/60 mb-8">Curriculum Vitae</h3>
        <div className="border border-white/5 bg-white/[0.02] rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xl font-medium text-white mb-2">Resume</h4>
              <p className="text-slate-400 text-sm max-w-md">Download my full resume to see a detailed overview of my experience, skills, and education.</p>
            </div>
          </div>
          <a
            href="/Resume.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center gap-3 px-6 py-3 overflow-hidden rounded-full border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/50 transition-all duration-300 flex-shrink-0 w-full md:w-auto"
          >
            <Download className="w-4 h-4 text-blue-400 group-hover:-translate-y-0.5 transition-transform" />
            <span className="text-sm font-medium text-blue-300">Download CV</span>
          </a>
        </div>
      </section>
    </div>
  );
}

function MirrorPanel() {
  return (
    <div className="space-y-20">
      {/* Header */}
      <div>
        <span className="text-xs uppercase tracking-[0.3em] text-purple-400/70 font-sans">
          Creative · Philosophy
        </span>
        <h2 className="text-5xl md:text-6xl font-light text-white mt-3 tracking-tight font-serif">
          The Mirror
        </h2>
        <p className="text-stone-400 mt-4 text-lg font-light max-w-xl italic">
          &ldquo;The artist disappears. Only the art remains.&rdquo;
        </p>
        <div className="h-px w-20 bg-purple-700 mt-6" />
      </div>

      {/* PRANAM Writings */}
      <section>
        <h3 className="text-xs uppercase tracking-[0.25em] text-purple-400/50 mb-12">from PRANAM</h3>
        <div className="space-y-16">
          {pranamWritings.map((writing) => (
            <div key={writing.title} className="max-w-2xl">
              <h4 className="text-xl font-light text-purple-200/80 mb-8">{writing.title}</h4>
              <div className="space-y-1">
                {writing.body.split("\n").map((line, i) => (
                  <p
                    key={i}
                    className={
                      line === ""
                        ? "h-4"
                        : "text-stone-300 text-lg leading-loose font-light"
                    }
                  >
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Poetry */}
      <section>
        <h3 className="text-xs uppercase tracking-[0.25em] text-purple-400/50 mb-12">Poetry</h3>
        <div className="grid md:grid-cols-3 gap-8">
          {poems.map((poem) => (
            <div key={poem.title} className="border border-purple-900/20 bg-purple-900/5 rounded-2xl p-8">
              <h4 className="text-sm uppercase tracking-[0.2em] text-purple-400/60 mb-8">{poem.title}</h4>
              <div className="space-y-2">
                {poem.lines.map((line, i) => (
                  <p key={i} className="text-stone-300 text-base leading-relaxed font-light italic">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Philosophy */}
      <section>
        <h3 className="text-xs uppercase tracking-[0.25em] text-purple-400/50 mb-12">Inner Inquiry</h3>
        <div className="space-y-6">
          {philosophyTopics.map((topic) => (
            <div key={topic.title} className="border border-white/5 bg-white/[0.015] rounded-2xl p-8">
              <h4 className="text-2xl font-light text-white mb-4">{topic.title}</h4>
              <p className="text-stone-400 leading-relaxed mb-6 max-w-2xl">{topic.content}</p>
              <p className="text-purple-400/60 text-sm italic border-l border-purple-900/40 pl-4">
                &ldquo;{topic.quote}&rdquo;
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ArchivePanel() {
  return (
    <div className="space-y-16">
      {/* Header */}
      <div>
        <span className="text-xs uppercase tracking-[0.3em] text-amber-400/70 font-sans">
          Great Minds · Wisdom
        </span>
        <h2 className="text-5xl md:text-6xl font-bold text-white mt-3 tracking-tight">
          The Archive
        </h2>
        <p className="text-stone-400 mt-4 text-lg font-light max-w-xl">
          Those who lived beyond themselves. Not answers — but better questions.
        </p>
        <div className="h-px w-20 bg-amber-700 mt-6" />
      </div>

      <div className="space-y-6">
        {greatMinds.map((mind) => (
          <div
            key={mind.name}
            className="group border border-white/5 bg-white/[0.02] hover:border-amber-500/15 hover:bg-amber-500/[0.03] rounded-2xl p-8 transition-all duration-400"
          >
            <div className="flex items-start justify-between mb-6 gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-white">{mind.name}</h3>
                <p className="text-amber-400/50 text-xs tracking-widest mt-1">{mind.era}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-amber-500/50 mt-2 flex-shrink-0 group-hover:bg-amber-400 transition-colors" />
            </div>

            <p className="text-amber-300/70 text-sm font-medium mb-5 italic">
              &ldquo;{mind.coreIdea}&rdquo;
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-stone-600 mb-2">Core Thought</p>
                <p className="text-stone-300 text-sm leading-relaxed">{mind.description}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-stone-600 mb-2">Aditya&apos;s Reading</p>
                <p className="text-stone-400 text-sm leading-relaxed italic">{mind.adityaInterpretation}</p>
              </div>
            </div>

            <div className="border-t border-white/5 pt-5">
              <p className="text-stone-600 text-sm">
                &ldquo;{mind.quote}&rdquo;
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CosmosPanel() {
  return (
    <div className="space-y-16">
      {/* Header */}
      <div>
        <span className="text-xs uppercase tracking-[0.3em] text-indigo-400/70 font-sans">
          Science · Systems · Reality
        </span>
        <h2 className="text-5xl md:text-6xl font-bold text-white mt-3 tracking-tight">
          The Cosmos
        </h2>
        <p className="text-slate-400 mt-4 text-lg font-light max-w-xl">
          We are the universe examining itself. Every question is the cosmos asking about its own nature.
        </p>
        <div className="h-px w-20 bg-indigo-700 mt-6" />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {cosmosTopics.map((topic) => (
          <div
            key={topic.title}
            className="group border border-white/5 bg-white/[0.02] hover:border-indigo-500/20 hover:bg-indigo-500/[0.03] rounded-2xl p-7 transition-all duration-400"
          >
            <div className="mb-5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-indigo-400/50 border border-indigo-500/20 px-2 py-0.5 rounded">
                {topic.category}
              </span>
              <h3 className="text-xl font-semibold text-white mt-3">{topic.title}</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-slate-600 mb-1">Concept</p>
                <p className="text-slate-300 text-sm leading-relaxed">{topic.concept}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-slate-600 mb-1">Key Insight</p>
                <p className="text-slate-400 text-sm leading-relaxed">{topic.insight}</p>
              </div>
              <div className="border-t border-white/5 pt-4">
                <p className="text-indigo-400/50 text-xs italic leading-relaxed">{topic.reflection}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Zone config ─────────────────────────────────────────────────────────────

const zoneConfig: Record<ZoneId, { icon: React.ComponentType<{ className?: string }>; accent: string; label: string }> = {
  maker: { icon: Cpu, accent: "text-blue-400", label: "The Maker" },
  mirror: { icon: Feather, accent: "text-purple-400", label: "The Mirror" },
  archive: { icon: BookOpen, accent: "text-amber-400", label: "The Archive" },
  cosmos: { icon: Globe, accent: "text-indigo-400", label: "The Cosmos" },
};

// ─── Main Focus Panel ─────────────────────────────────────────────────────────

export default function FocusPanel() {
  const focusZone = useStore((s) => s.focusZone);
  const setFocusZone = useStore((s) => s.setFocusZone);

  return (
    <AnimatePresence>
      {focusZone && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-40 bg-black/90 backdrop-blur-2xl"
            onClick={() => setFocusZone(null)}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 bottom-0 top-16 z-50 overflow-y-auto"
          >
            <div className="min-h-full px-6 md:px-12 lg:px-24 py-12 max-w-5xl mx-auto">
              {/* Panel header */}
              <div className="flex items-center justify-between mb-16 sticky top-0 bg-black/60 backdrop-blur-sm py-4 -mx-4 px-4 rounded-xl z-10">
                <button
                  onClick={() => setFocusZone(null)}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors group"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Back to Explore
                </button>

                <div className="flex items-center gap-2">
                  {(() => {
                    const config = zoneConfig[focusZone];
                    const Icon = config.icon;
                    return (
                      <>
                        <Icon className={`w-4 h-4 ${config.accent}`} />
                        <span className={`text-xs uppercase tracking-widest ${config.accent}`}>
                          {config.label}
                        </span>
                      </>
                    );
                  })()}
                </div>

                <button
                  onClick={() => setFocusZone(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-white/10 hover:border-white/30 transition-colors text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              {focusZone === "maker" && <MakerPanel />}
              {focusZone === "mirror" && <MirrorPanel />}
              {focusZone === "archive" && <ArchivePanel />}
              {focusZone === "cosmos" && <CosmosPanel />}

              {/* Bottom spacer */}
              <div className="h-24" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
