import { useState } from "react";
import socket from "../socket.js";

export default function Sidebar({ user, onlineUsers }) {
  const [search, setSearch] = useState("");

  const filtered = onlineUsers.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-60 flex flex-col shrink-0 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)" }}>

      {/* Logo / workspace */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
            style={{ background: "linear-gradient(135deg,#667eea,#764ba2)" }}>
            🌌
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Virtual Cosmos</p>
            <p className="text-purple-300 text-[10px]">Office Space</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
          <span className="text-purple-300 text-xs">🔍</span>
          <input
            className="flex-1 bg-transparent text-white text-xs placeholder-purple-300 focus:outline-none"
            placeholder="Search people..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Nav */}
      <div className="px-3 flex flex-col gap-0.5">
        <NavItem icon="⚡" label="Activities" />
        <NavItem icon="💬" label="Recent Chats" />
        <NavItem icon="📅" label="Calendar" />
      </div>

      {/* Divider */}
      <div className="mx-3 my-3 border-t border-white/10" />

      {/* Rooms */}
      <div className="px-3 mb-2">
        <p className="text-purple-400 text-[10px] font-bold uppercase tracking-widest mb-2">Rooms</p>
        <NavItem icon="🚪" label="Meeting Room" dot="purple" />
        <NavItem icon="☕" label="Lounge" dot="orange" />
        <NavItem icon="💻" label="Product Team" dot="blue" />
        <NavItem icon="🎯" label="CX Team" dot="green" />
      </div>

      {/* Channels */}
      <div className="px-3 mb-2">
        <p className="text-purple-400 text-[10px] font-bold uppercase tracking-widest mb-2">Channels</p>
        <NavItem icon="#" label="general-chat" />
        <NavItem icon="#" label="doubts" />
      </div>

      {/* Divider */}
      <div className="mx-3 my-1 border-t border-white/10" />

      {/* Online users */}
      <div className="px-3 py-2 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <p className="text-purple-400 text-[10px] font-bold uppercase tracking-widest">Online</p>
          <span className="bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            {filtered.length}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {filtered.map(u => {
            const isSelf = u.id === socket.id;
            return (
              <div key={u.id}
                className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors group">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: u.color }}>
                    {u.name[0].toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2"
                    style={{ borderColor: "#312e81" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">
                    {u.name}{isSelf && <span className="text-purple-400 font-normal"> (you)</span>}
                  </p>
                  <p className="text-purple-400 text-[10px]">In Space</p>
                </div>
                {!isSelf && (
                  <span className="text-[9px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    GUEST
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Self footer */}
      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: user.color }}>
            {user.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-bold truncate">{user.name}</p>
            <p className="text-green-400 text-[10px]">● Active</p>
          </div>
          <button className="text-purple-400 hover:text-white text-sm transition-colors">⚙️</button>
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, dot }) {
  const dotColors = { purple: "bg-purple-400", orange: "bg-orange-400", blue: "bg-blue-400", green: "bg-green-400" };
  return (
    <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-xs text-purple-200 hover:text-white">
      <span className="text-sm w-4 text-center">{icon}</span>
      <span className="flex-1">{label}</span>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[dot] || "bg-gray-400"}`} />}
    </div>
  );
}
