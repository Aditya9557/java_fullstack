import React, { useRef, useState, useEffect } from "react";

const PaintCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#06b6d4"); // Default Cyan
  const [brushSize, setBrushSize] = useState(4);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const colors = [
    { name: "Cyan", hex: "#06b6d4" },
    { name: "Rose", hex: "#f43f5e" },
    { name: "Amber", hex: "#f59e0b" },
    { name: "Emerald", hex: "#10b981" },
    { name: "Violet", hex: "#8b5cf6" },
    { name: "White", hex: "#ffffff" }
  ];

  // Adjust canvas size to match visual container size
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = 160 * window.devicePixelRatio; // Keep height fixed/proportional
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    }
  };

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Update stroke properties on context when color/size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
    }
  }, [color, brushSize]);

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pos = getCoordinates(e);
    setLastPos(pos);
    setIsDrawing(true);
    
    // Draw a single dot on click
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const currentPos = getCoordinates(e);

    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    }
    setLastPos(currentPos);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-slate-200/10 bg-slate-500/5 hover:bg-slate-500/10 transition-all flex flex-col justify-between gap-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">1. Sketch Canvas</h3>
          <p className="text-sm opacity-60">Draw on the responsive canvas pad</p>
        </div>
        <button
          onClick={clearCanvas}
          className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-md transition-all active:scale-95 border border-red-500/20"
        >
          Clear
        </button>
      </div>

      <div className="relative border border-slate-200/10 rounded-xl bg-slate-950 overflow-hidden cursor-crosshair h-40">
        <canvas
          ref={canvasRef}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          className="w-full h-full touch-none"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Brush Size Slider */}
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-50 font-semibold uppercase tracking-wider">Brush</span>
          <input
            type="range"
            min="1"
            max="12"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="text-xs font-bold text-cyan-400 w-4">{brushSize}px</span>
        </div>

        {/* Color Palette Selector */}
        <div className="flex items-center gap-1.5">
          {colors.map((c) => (
            <button
              key={c.hex}
              onClick={() => setColor(c.hex)}
              style={{ backgroundColor: c.hex }}
              className={`w-6 h-6 rounded-full transition-all duration-200 active:scale-90 ${
                color === c.hex
                  ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 scale-110"
                  : "hover:scale-105 opacity-80 hover:opacity-100"
              }`}
              title={c.name}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaintCanvas;
