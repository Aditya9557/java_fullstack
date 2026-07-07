import React, { useState, useEffect, useRef } from "react";

const PomodoroTimer: React.FC = () => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const timerRef = useRef<any | null>(null);

  // Sync totalSeconds whenever preset changes (only when inactive)
  const setPreset = (mins: number) => {
    if (!isActive) {
      setMinutes(mins);
      setSeconds(0);
      setTotalSeconds(mins * 60);
    }
  };

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (seconds > 0) {
          setSeconds((s) => s - 1);
        } else if (minutes > 0) {
          setMinutes((m) => m - 1);
          setSeconds(59);
        } else {
          // Timer finished
          setIsActive(false);
          if (timerRef.current) clearInterval(timerRef.current);
          alert("Focus session complete! Take a break.");
          setPreset(25);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, minutes, seconds]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(25);
    setSeconds(0);
    setTotalSeconds(25 * 60);
  };

  // SVG circular path calculations
  const remainingSeconds = minutes * 60 + seconds;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (remainingSeconds / totalSeconds) * circumference;

  return (
    <div className="p-6 rounded-2xl border border-slate-200/10 bg-slate-500/5 hover:bg-slate-500/10 transition-all flex flex-col justify-between gap-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">6. Smart Focus Timer</h3>
          <p className="text-sm opacity-60">Pomodoro clock with visual progress ring</p>
        </div>
        
        {/* Preset chips */}
        <div className="flex gap-1">
          {[25, 15, 5].map((m) => (
            <button
              key={m}
              onClick={() => setPreset(m)}
              disabled={isActive}
              className={`px-1.5 py-0.5 text-[10px] font-bold rounded transition-all ${
                minutes === m && seconds === 0
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "bg-slate-900 text-slate-400 border border-slate-200/5 disabled:opacity-40 hover:opacity-100"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-around py-1 gap-4">
        {/* Visual Progress ring */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-slate-800 fill-none"
              strokeWidth="5"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              className="stroke-cyan-500 fill-none transition-all duration-1000 ease-linear"
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={isNaN(strokeDashoffset) ? 0 : strokeDashoffset}
            />
          </svg>
          <div className="absolute font-mono text-xl font-bold tracking-tight text-cyan-400">
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2 w-28">
          <button
            onClick={toggleTimer}
            className={`w-full py-2 text-xs font-bold rounded-xl transition-all active:scale-95 text-white ${
              isActive 
                ? "bg-rose-600 hover:bg-rose-700" 
                : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-md shadow-cyan-500/10"
            }`}
          >
            {isActive ? "Pause" : "Start Focus"}
          </button>
          
          <button
            onClick={resetTimer}
            className="w-full py-1.5 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-200/10 hover:bg-slate-800 transition-all active:scale-95 text-slate-300"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;
