import { useEffect } from "react";
import socket from "../socket.js";

export default function Toolbar({ user, muted, setMuted, camOff, setCamOff, chatRooms, chatOpen, setChatOpen }) {
  const chatCount = Object.keys(chatRooms).length;

  useEffect(() => {
    if (chatCount > 0) setChatOpen(true);
  }, [chatCount]);

  function handleLeave() {
    socket.disconnect();
    window.location.reload();
  }

  return (
    <div className="h-[68px] flex items-center justify-between px-6 shrink-0 z-20 border-t"
      style={{ background: "rgba(255,255,255,0.97)", borderColor: "#e5e7eb", backdropFilter: "blur(12px)" }}>

      {/* Left: self */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md"
            style={{ background: user.color }}>
            {user.name[0].toUpperCase()}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800 leading-tight">{user.name}</p>
          <p className="text-[10px] text-gray-400">In Space · Active</p>
        </div>
      </div>

      {/* Center: controls */}
      <div className="flex items-center gap-1">
        <ToolBtn
          icon={muted ? "🔇" : "🎙️"}
          label={muted ? "Unmute" : "Mute"}
          active={muted}
          activeColor="red"
          onClick={() => setMuted(v => !v)}
        />
        <ToolBtn
          icon={camOff ? "📷" : "📹"}
          label={camOff ? "Cam Off" : "Camera"}
          active={camOff}
          activeColor="red"
          onClick={() => setCamOff(v => !v)}
        />
        <div className="w-px h-8 bg-gray-200 mx-1" />
        <ToolBtn icon="🖥️" label="Share" />
        <ToolBtn icon="✋" label="Hand" />
        <ToolBtn icon="😊" label="React" />
        <ToolBtn icon="⚡" label="Action" />
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Chat toggle */}
        <div className="relative">
          <button onClick={() => setChatOpen(v => !v)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              chatOpen && chatCount > 0
                ? "bg-blue-500 text-white shadow-md shadow-blue-200"
                : chatCount > 0
                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                  : "text-gray-400 hover:bg-gray-100"
            }`}>
            <span className="text-base">💬</span>
            <span>Chat</span>
          </button>
          {chatCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
              {chatCount}
            </span>
          )}
        </div>

        <ToolBtn icon="📱" label="Apps" />

        <button onClick={handleLeave}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm shadow-red-200">
          <span>Leave</span>
        </button>
      </div>
    </div>
  );
}

function ToolBtn({ icon, label, active, activeColor = "gray", onClick }) {
  const activeStyles = {
    red: "bg-red-50 text-red-600 ring-1 ring-red-200",
    blue: "bg-blue-50 text-blue-600 ring-1 ring-blue-200",
  };
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:bg-gray-100 active:scale-95 ${
        active ? (activeStyles[activeColor] || "bg-gray-100 text-gray-700") : "text-gray-500"
      }`}>
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
