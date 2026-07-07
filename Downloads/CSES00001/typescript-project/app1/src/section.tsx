import React from "react";

const Section: React.FC = () => {
  return (
    <section className="p-6 rounded-2xl border border-slate-200/10 bg-slate-500/5 hover:bg-slate-500/10 transition-all flex flex-col justify-between gap-6 shadow-sm">
      <div>
        <h3 className="font-bold text-lg">Subcomponent Card</h3>
        <p className="text-sm opacity-60 mt-1">This component is imported from <code>src/section.tsx</code> to test modular styling.</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-50">Useful Commands</span>
        <div className="flex flex-wrap gap-2">
          <code className="px-2.5 py-1 bg-slate-500/10 rounded-md text-xs border border-slate-200/5">npm run dev</code>
          <code className="px-2.5 py-1 bg-slate-500/10 rounded-md text-xs border border-slate-200/5">npm run build</code>
        </div>
      </div>
    </section>
  );
};

export default Section;