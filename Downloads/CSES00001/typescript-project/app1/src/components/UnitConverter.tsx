import React, { useState, useEffect } from "react";

type Mode = "temp" | "length" | "weight";

const UnitConverter: React.FC = () => {
  const [mode, setMode] = useState<Mode>("temp");
  const [valA, setValA] = useState<string>("0");
  const [valB, setValB] = useState<string>("32");

  const convert = (value: string, source: "A" | "B", currentMode: Mode = mode) => {
    const num = parseFloat(value);
    if (isNaN(num)) {
      if (source === "A") setValB("");
      else setValA("");
      return;
    }

    if (currentMode === "temp") {
      if (source === "A") {
        // C to F
        setValB(((num * 9) / 5 + 32).toFixed(2));
      } else {
        // F to C
        setValA((((num - 32) * 5) / 9).toFixed(2));
      }
    } else if (currentMode === "length") {
      if (source === "A") {
        // M to Ft
        setValB((num * 3.28084).toFixed(3));
      } else {
        // Ft to M
        setValA((num / 3.28084).toFixed(3));
      }
    } else if (currentMode === "weight") {
      if (source === "A") {
        // Kg to Lb
        setValB((num * 2.20462).toFixed(3));
      } else {
        // Lb to Kg
        setValA((num / 2.20462).toFixed(3));
      }
    }
  };

  // Convert whenever mode changes, keeping value A constant
  useEffect(() => {
    convert(valA, "A", mode);
  }, [mode]);

  const handleInput = (val: string, source: "A" | "B") => {
    if (source === "A") {
      setValA(val);
      convert(val, "A");
    } else {
      setValB(val);
      convert(val, "B");
    }
  };

  const getLabels = (): { labelA: string; labelB: string } => {
    switch (mode) {
      case "temp":
        return { labelA: "°Celsius", labelB: "°Fahrenheit" };
      case "length":
        return { labelA: "Meters", labelB: "Feet" };
      case "weight":
        return { labelA: "Kilograms", labelB: "Pounds" };
    }
  };

  const labels = getLabels();

  return (
    <div className="p-6 rounded-2xl border border-slate-200/10 bg-slate-500/5 hover:bg-slate-500/10 transition-all flex flex-col justify-between gap-4 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">5. Unit Converter</h3>
          <p className="text-sm opacity-60">Dual-axis live unit conversions</p>
        </div>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          className="text-xs font-semibold bg-slate-900 border border-slate-200/10 rounded-md py-1 px-2.5 outline-none text-slate-200 cursor-pointer"
        >
          <option value="temp">Temperature</option>
          <option value="length">Length</option>
          <option value="weight">Weight</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 my-2">
        {/* Input A */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider opacity-50">{labels.labelA}</label>
          <input
            type="number"
            value={valA}
            onChange={(e) => handleInput(e.target.value, "A")}
            className="w-full bg-slate-950 border border-slate-200/10 rounded-xl px-4 py-2.5 font-mono text-sm focus:outline-none focus:border-cyan-500 text-cyan-400 font-bold"
            placeholder="0"
          />
        </div>

        {/* Input B */}
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold tracking-wider opacity-50">{labels.labelB}</label>
          <input
            type="number"
            value={valB}
            onChange={(e) => handleInput(e.target.value, "B")}
            className="w-full bg-slate-950 border border-slate-200/10 rounded-xl px-4 py-2.5 font-mono text-sm focus:outline-none focus:border-cyan-500 text-cyan-400 font-bold"
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
};

export default UnitConverter;
