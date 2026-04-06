"use client";

import { motion } from "framer-motion";
import { ExternalLink, GitBranch } from "lucide-react";

interface ProjectProps {
  title: string;
  subtitle: string;
  problem: string;
  solution: string;
  outcome: string;
  thought: string;
  techStack: string[];
  liveUrl?: string;
}

export default function ProjectCard({
  project,
  index,
}: {
  project: ProjectProps;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay: index * 0.12 }}
      className="group relative bg-slate-900/40 border border-slate-800/60 rounded-2xl p-7 md:p-9 hover:border-slate-700/80 hover:bg-slate-900/70 transition-all duration-500 flex flex-col"
    >
      {/* Corner accent glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/4 rounded-bl-full rounded-tr-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-start mb-7">
        <div>
          <h3 className="text-xl md:text-2xl font-semibold text-slate-100 mb-1">
            {project.title}
          </h3>
          <p className="text-slate-500 text-sm">{project.subtitle}</p>
        </div>
        <div className="flex gap-3 text-slate-600 group-hover:text-slate-400 transition-colors mt-1">
          {project.liveUrl ? (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition-colors"
              title="View Live Demo"
            >
              <ExternalLink size={18} />
            </a>
          ) : (
            <span className="opacity-30 cursor-not-allowed">
              <ExternalLink size={18} />
            </span>
          )}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="flex flex-wrap gap-2 mb-7">
        {project.techStack.map((tech) => (
          <span
            key={tech}
            className="px-3 py-1 bg-slate-800/80 text-slate-300 text-xs font-medium rounded-full border border-slate-700/50 tracking-wide"
          >
            {tech}
          </span>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-5 mb-8 flex-1">
        {[
          { label: "Problem", text: project.problem },
          { label: "Solution", text: project.solution },
          { label: "Impact", text: project.outcome },
        ].map(({ label, text }) => (
          <div key={label}>
            <span className="text-slate-600 text-[10px] font-semibold tracking-[0.2em] uppercase block mb-1.5">
              {label}
            </span>
            <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      {/* Thought */}
      <div className="pt-6 border-t border-slate-800/70">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-600 mb-2">
          🧠 Thought behind this
        </p>
        <p className="text-slate-400 italic font-light text-sm leading-relaxed">
          "{project.thought}"
        </p>
      </div>
    </motion.div>
  );
}
