import React, { useState } from "react";
import Section from "./section";

const App: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [clickCount, setClickCount] = useState<number>(0);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col justify-between ${
      theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    }`}>
      {/* Header */}
      <header className="border-b border-slate-200/10 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-white font-extrabold text-xl tracking-wider">T</span>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-none bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Tailwind CSS v4
            </h1>
            <span className="text-xs opacity-60">React + TypeScript + Vite</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-lg border border-slate-200/10 hover:bg-slate-200/10 transition-all flex items-center gap-2 text-sm font-medium"
          >
            {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto w-full px-6 py-12 flex-grow flex flex-col justify-center gap-8">
        <div className="text-center space-y-4">
          <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Successfully Configured
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Tailwind CSS is <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Live & Ready</span>
          </h2>
          <p className="max-w-xl mx-auto text-sm md:text-base opacity-75 leading-relaxed">
            Your workspace has been successfully updated with React 18, Vite, TypeScript, and the brand-new Tailwind CSS v4 native compiler engine.
          </p>
        </div>

        {/* Dynamic Widget Grid */}
        <div className="grid md:grid-cols-2 gap-6 mt-4">
          {/* Card 1: Interactive State Check */}
          <div className="p-6 rounded-2xl border border-slate-200/10 bg-slate-500/5 hover:bg-slate-500/10 transition-all flex flex-col justify-between gap-6 shadow-sm">
            <div>
              <h3 className="font-bold text-lg">Interactive State Check</h3>
              <p className="text-sm opacity-60 mt-1">Test React reactivity combined with Tailwind hover and active styles.</p>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setClickCount(prev => prev + 1)}
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md transition-all active:scale-95 text-sm"
              >
                Click Counter
              </button>
              <div className="text-sm">
                Count: <span className="font-bold text-cyan-400 text-lg">{clickCount}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Section Component (Tailwind-styled) */}
          <Section />
        </div>

        {/* Features Checklist */}
        <div className="p-6 rounded-2xl border border-slate-200/10 bg-slate-500/5 mt-4">
          <h3 className="font-bold text-base mb-4">Development Environment Status</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Vite Dev Server", status: "Active" },
              { label: "Tailwind CSS v4", status: "Installed" },
              { label: "React 18 Engine", status: "Running" },
              { label: "TypeScript Strict Mode", status: "Enabled" }
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
                <span className="opacity-80">{item.label}:</span>
                <span className="font-semibold text-emerald-400">{item.status}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/10 px-6 py-6 text-center text-xs opacity-50">
        Workspace fully configured. Ready for web application development.
      </footer>
    </div>
  );
};

export default App;