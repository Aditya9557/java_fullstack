import React, { useState, useEffect } from "react";

const PasswordGenerator: React.FC = () => {
  const [password, setPassword] = useState("");
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    let charset = "";
    if (includeUppercase) charset += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (includeLowercase) charset += "abcdefghijklmnopqrstuvwxyz";
    if (includeNumbers) charset += "0123456789";
    if (includeSymbols) charset += "!@#$%^&*()_+~`|}{[]:;?><,./-=";

    if (charset === "") {
      setPassword("Select at least one option");
      return;
    }

    let result = "";
    const arr = new Uint32Array(length);
    window.crypto.getRandomValues(arr);
    for (let i = 0; i < length; i++) {
      result += charset[arr[i] % charset.length];
    }
    setPassword(result);
  };

  useEffect(() => {
    generatePassword();
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols]);

  const copyToClipboard = () => {
    if (password === "Select at least one option") return;
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="p-6 rounded-2xl border border-slate-200/10 bg-slate-500/5 hover:bg-slate-500/10 transition-all flex flex-col justify-between gap-4 shadow-sm">
      <div>
        <h3 className="font-bold text-lg">4. Password Generator</h3>
        <p className="text-sm opacity-60">Generate secure cryptographic keys locally</p>
      </div>

      {/* Output field */}
      <div className="relative flex items-center bg-slate-950 border border-slate-200/10 rounded-xl px-4 py-3 font-mono text-sm overflow-hidden select-all pr-12">
        <span className="truncate w-full text-cyan-400 select-all font-bold tracking-wider">
          {password}
        </span>
        <button
          onClick={copyToClipboard}
          className={`absolute right-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-95 border ${
            copied
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-200/5"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Length slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold uppercase tracking-wider opacity-60">
          <span>Length</span>
          <span className="text-cyan-400 font-bold">{length} characters</span>
        </div>
        <input
          type="range"
          min="8"
          max="32"
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
      </div>

      {/* Checklist Grid */}
      <div className="grid grid-cols-2 gap-2 mt-1">
        {[
          { label: "Uppercase", state: includeUppercase, setter: setIncludeUppercase },
          { label: "Lowercase", state: includeLowercase, setter: setIncludeLowercase },
          { label: "Numbers", state: includeNumbers, setter: setIncludeNumbers },
          { label: "Symbols", state: includeSymbols, setter: setIncludeSymbols }
        ].map((item, idx) => (
          <label key={idx} className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={item.state}
              onChange={() => item.setter(!item.state)}
              className="w-4 h-4 rounded-md border-slate-200/10 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
            />
            <span className="opacity-80 hover:opacity-100">{item.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default PasswordGenerator;
