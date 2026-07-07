import React, { useState, useEffect, useRef } from "react";

const StockTicker: React.FC = () => {
  const [price, setPrice] = useState(65230);
  const [prevPrice, setPrevPrice] = useState(65230);
  const [history, setHistory] = useState<number[]>(new Array(30).fill(65230));
  const [isSimulating, setIsSimulating] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setPrice((currentPrice) => {
        // Generate a random walk (between -1.5% and +1.6% price movements)
        const percentChange = (Math.random() * 3.1 - 1.5) / 100;
        const newPrice = Math.round(currentPrice * (1 + percentChange) * 100) / 100;
        
        setPrevPrice(currentPrice);
        setHistory((h) => {
          const updated = [...h.slice(1), newPrice];
          return updated;
        });
        return newPrice;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // Draw Sparkline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear and set sizes
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = 48 * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const w = rect.width;
    const h = 48;

    ctx.clearRect(0, 0, w, h);

    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min === 0 ? 1 : max - min;

    // Line drawing setup
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Set colors depending on trend direction
    const isUp = price >= history[0];
    const strokeColor = isUp ? "#10b981" : "#f43f5e";
    ctx.strokeStyle = strokeColor;

    history.forEach((val, index) => {
      const x = (index / (history.length - 1)) * w;
      // Inverted Y coordinates for canvas rendering
      const y = h - 4 - ((val - min) / range) * (h - 8);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Fill under sparkline
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, isUp ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fill();

  }, [history, price]);

  const priceDiff = price - prevPrice;
  const isGain = priceDiff >= 0;

  return (
    <div className="p-6 rounded-2xl border border-slate-200/10 bg-slate-500/5 hover:bg-slate-500/10 transition-all flex flex-col justify-between gap-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">3. Live Crypto Simulator</h3>
          <p className="text-sm opacity-60">Real-time simulated ticker and sparkline</p>
        </div>
        
        <button
          onClick={() => setIsSimulating(!isSimulating)}
          className={`px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-md transition-all active:scale-95 border ${
            isSimulating
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          }`}
        >
          {isSimulating ? "Pause" : "Resume"}
        </button>
      </div>

      <div className="flex items-end justify-between py-2">
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-40">BTC / USD</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight font-mono">
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-mono transition-all duration-300 ${
            isGain 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}>
            {isGain ? "▲" : "▼"} {isGain ? "+" : ""}{priceDiff.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Sparkline Canvas */}
      <div className="w-full h-12 relative overflow-hidden bg-slate-950/40 rounded-lg border border-slate-200/5">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default StockTicker;
