import React, { useState } from "react";
import PaintCanvas from "./components/PaintCanvas";
import AudioSynth from "./components/AudioSynth";
import StockTicker from "./components/StockTicker";
import PasswordGenerator from "./components/PasswordGenerator";
import UnitConverter from "./components/UnitConverter";
import PomodoroTimer from "./components/PomodoroTimer";

const App: React.FC = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 flex flex-col justify-between ${
      theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
    }`}>
      {/* Header */}
      <header className="border-b border-slate-200/10 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <span className="text-white font-extrabold text-xl tracking-wider">A</span>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-none bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Interactive Hub
            </h1>
            <span className="text-xs opacity-60">Dashboard App1</span>
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
      <main className="max-w-7xl mx-auto w-full px-6 py-12 flex-grow flex flex-col gap-8">
        
        {/* Title Section */}
        <div className="text-center space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Developer Workspace
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            6 Dynamic <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Functional Divs</span>
          </h2>
          <p className="max-w-xl mx-auto text-sm md:text-base opacity-75 leading-relaxed">
            An interactive dashboard layout featuring responsive canvas drawing, synthesizers, simulated ticker streams, conversions, timers, and crypto-key generators.
          </p>
        </div>

        {/* Dashboard Grid - 3 cols on large screens, 2 on medium, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          <PaintCanvas />
          <AudioSynth />
          <StockTicker />
          <PasswordGenerator />
          <UnitConverter />
          <PomodoroTimer />
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/10 px-6 py-6 text-center text-xs opacity-50">
        Workspace fully configured. App1 Dashboard live and responsive.
      </footer>
    </div>
  );
};

export default App;