import React, { useState, useRef } from "react";

interface Note {
  label: string;
  freq: number;
  color: string;
}

const AudioSynth: React.FC = () => {
  const [waveType, setWaveType] = useState<OscillatorType>("sine");
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const notes: Note[] = [
    { label: "C4", freq: 261.63, color: "from-cyan-500 to-blue-500" },
    { label: "E4", freq: 329.63, color: "from-blue-500 to-indigo-500" },
    { label: "G4", freq: 392.00, color: "from-indigo-500 to-purple-500" },
    { label: "C5", freq: 523.25, color: "from-purple-500 to-pink-500" }
  ];

  const playNote = (note: Note) => {
    try {
      // Lazy initialize AudioContext on user interaction
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Create Audio Nodes
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = waveType;
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime);

      // Envelope configuration: fast attack, quick decay, release fade
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05); // Attack
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8); // Decay/Release

      // Connect Nodes
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Play & Stop
      osc.start();
      osc.stop(ctx.currentTime + 0.85);

      // Visual trigger
      setActiveNote(note.label);
      setTimeout(() => {
        setActiveNote((prev) => (prev === note.label ? null : prev));
      }, 300);

    } catch (err) {
      console.error("Audio Context play error:", err);
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-slate-200/10 bg-slate-500/5 hover:bg-slate-500/10 transition-all flex flex-col justify-between gap-4 shadow-sm">
      <div>
        <h3 className="font-bold text-lg">2. Ambient Synthesizer</h3>
        <p className="text-sm opacity-60">Generate real-time tones using Web Audio API</p>
      </div>

      {/* Wave selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs opacity-50 font-semibold uppercase tracking-wider">Waveform</span>
        <div className="flex bg-slate-900 border border-slate-200/10 rounded-lg p-0.5 w-full justify-between">
          {(["sine", "triangle", "sawtooth"] as OscillatorType[]).map((type) => (
            <button
              key={type}
              onClick={() => setWaveType(type)}
              className={`flex-1 text-xs py-1.5 capitalize rounded-md font-semibold transition-all ${
                waveType === type
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm"
                  : "opacity-60 hover:opacity-100 text-slate-400"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Synthesis pads */}
      <div className="grid grid-cols-4 gap-3 mt-1">
        {notes.map((note) => {
          const isActive = activeNote === note.label;
          return (
            <button
              key={note.label}
              onPointerDown={() => playNote(note)}
              className={`relative overflow-hidden aspect-square rounded-xl bg-slate-900 border border-slate-200/10 flex flex-col justify-center items-center transition-all duration-150 active:scale-95 cursor-pointer shadow-md select-none group ${
                isActive
                  ? "ring-2 ring-cyan-400 border-transparent scale-95"
                  : "hover:border-slate-200/25"
              }`}
            >
              {/* Note waves background visualizer */}
              {isActive && (
                <span className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-pink-500/20 animate-pulse pointer-events-none" />
              )}
              <span className={`w-2.5 h-2.5 rounded-full mb-1 transition-all ${
                isActive ? "bg-cyan-400 scale-150 shadow-lg shadow-cyan-400/50" : "bg-slate-700 group-hover:bg-slate-500"
              }`} />
              <span className="font-mono font-bold tracking-tight text-sm text-slate-300">
                {note.label}
              </span>
              <span className="text-[10px] opacity-40 font-mono">
                {Math.round(note.freq)}Hz
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AudioSynth;
