import { useState } from "react";

const COLORS = ["#f87171","#fb923c","#facc15","#4ade80","#60a5fa","#c084fc","#f472b6","#34d399"];
const SKIN   = ["#FDDBB4","#F5C28A","#E8A96A","#C68642","#8D5524","#FDDBB4","#F5C28A","#E8A96A"];
const HAIR   = ["#1a1a1a","#4a3728","#8B4513","#D4A017","#1a1a1a","#4a3728","#8B4513","#D4A017"];
const LABELS = ["Red","Orange","Yellow","Green","Blue","Purple","Pink","Teal"];

function MiniChar({ color, size = 36 }) {
  const i = COLORS.indexOf(color) >= 0 ? COLORS.indexOf(color) : 0;
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 32 48">
      <rect x={9}  y={32} width={6}  height={12} rx="2" fill={color} opacity="0.85"/>
      <rect x={17} y={32} width={6}  height={12} rx="2" fill={color} opacity="0.85"/>
      <rect x={8}  y={42} width={8}  height={4}  rx="2" fill="#1a1a1a"/>
      <rect x={16} y={42} width={8}  height={4}  rx="2" fill="#1a1a1a"/>
      <rect x={7}  y={18} width={18} height={16} rx="3" fill={color}/>
      <rect x={1}  y={19} width={6}  height={10} rx="2" fill={SKIN[i]}/>
      <rect x={25} y={19} width={6}  height={10} rx="2" fill={SKIN[i]}/>
      <rect x={13} y={14} width={6}  height={6}  fill={SKIN[i]}/>
      <rect x={6}  y={4}  width={20} height={18} rx="5" fill={SKIN[i]}/>
      <rect x={6}  y={4}  width={20} height={8}  rx="5" fill={HAIR[i]}/>
      <rect x={6}  y={4}  width={5}  height={14} rx="2" fill={HAIR[i]}/>
      <rect x={10} y={13} width={4}  height={4}  rx="1" fill="#111"/>
      <rect x={18} y={13} width={4}  height={4}  rx="1" fill="#111"/>
      <rect x={11} y={13} width={2}  height={2}  fill="white" opacity="0.8"/>
      <rect x={19} y={13} width={2}  height={2}  fill="white" opacity="0.8"/>
    </svg>
  );
}

export default function NameModal({ onJoin }) {
  const [name,     setName]     = useState("");
  const [colorIdx, setColorIdx] = useState(0);

  function handleSubmit(e) {
    e.preventDefault();
    if (name.trim()) onJoin({ name: name.trim(), colorIdx });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(135deg, #1a2a1a 0%, #2d4a2d 50%, #1a3a2a 100%)" }}>

      {/* Floating orbs */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="absolute rounded-full opacity-10 blur-xl"
          style={{
            width: 120 + i * 40, height: 120 + i * 40,
            background: COLORS[i],
            left: `${(i * 137) % 90}%`, top: `${(i * 97) % 80}%`,
            transform: "translate(-50%,-50%)",
          }} />
      ))}

      <div className="relative w-[460px] mx-4">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden">
          {/* Top banner */}
          <div className="px-8 pt-8 pb-6 text-center"
            style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
            <div className="text-5xl mb-3">🌌</div>
            <h1 className="text-2xl font-black text-white tracking-tight">Virtual Cosmos</h1>
            <p className="text-purple-200 text-sm mt-1">A 2D space where proximity = connection</p>
          </div>

          <div className="px-8 py-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Name */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">
                  Your Name
                </label>
                <input
                  autoFocus
                  className="w-full border-2 border-gray-100 bg-gray-50 rounded-2xl px-4 py-3 text-gray-900 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:bg-white text-sm font-medium transition-all"
                  placeholder="Enter your name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={20}
                />
              </div>

              {/* Character picker */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 block">
                  Choose Your Character
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COLORS.map((color, i) => (
                    <button key={i} type="button" onClick={() => setColorIdx(i)}
                      className={`relative flex flex-col items-center py-3 rounded-2xl border-2 transition-all duration-150 ${
                        colorIdx === i
                          ? "border-purple-500 shadow-lg scale-105"
                          : "border-gray-100 hover:border-gray-300 hover:scale-102 bg-gray-50"
                      }`}
                      style={colorIdx === i ? { background: `${color}18` } : {}}>
                      <MiniChar color={color} size={28} />
                      <span className="text-[9px] font-semibold mt-1"
                        style={{ color: colorIdx === i ? color : "#9ca3af" }}>
                        {LABELS[i]}
                      </span>
                      {colorIdx === i && (
                        <span className="absolute top-1 right-1 w-3 h-3 rounded-full flex items-center justify-center"
                          style={{ background: color }}>
                          <span className="text-white text-[8px]">✓</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {name.trim() && (
                <div className="flex items-center gap-4 rounded-2xl px-4 py-3 border-2 border-dashed"
                  style={{ borderColor: COLORS[colorIdx], background: `${COLORS[colorIdx]}10` }}>
                  <MiniChar color={COLORS[colorIdx]} size={40} />
                  <div>
                    <p className="font-bold text-gray-900">{name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ready to explore the cosmos</p>
                  </div>
                  <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                </div>
              )}

              <button type="submit" disabled={!name.trim()}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: name.trim() ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "#d1d5db" }}>
                Enter Cosmos →
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-green-300/60 text-xs mt-4">
          Walk close to others · Chat opens automatically · Walk away to disconnect
        </p>
      </div>
    </div>
  );
}
