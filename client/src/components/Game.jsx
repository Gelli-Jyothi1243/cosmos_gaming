import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../socket.js";
import ChatPanel from "./ChatPanel.jsx";
import Sidebar from "./Sidebar.jsx";
import Toolbar from "./Toolbar.jsx";

const SPEED   = 4;
const WORLD_W = 2200;
const WORLD_H = 1600;

const COLORS = ["#f87171","#fb923c","#facc15","#4ade80","#60a5fa","#c084fc","#f472b6","#34d399"];
const SKIN   = ["#FDDBB4","#F5C28A","#E8A96A","#C68642","#8D5524","#FDDBB4","#F5C28A","#E8A96A"];
const HAIR   = ["#1a1a1a","#4a3728","#8B4513","#D4A017","#1a1a1a","#4a3728","#8B4513","#D4A017"];

function ci(color) { const i = COLORS.indexOf(color); return i >= 0 ? i : 0; }

const ROOMS = [
  { id:"meeting", x:40,  y:40,  w:320, h:260, floor:"#c8c8e8", wall:"#7c7caa", label:"Meeting Room" },
  { id:"office",  x:40,  y:340, w:200, h:220, floor:"#c8dde8", wall:"#6a9ab0", label:"Office" },
  { id:"bath",    x:40,  y:600, w:200, h:180, floor:"#b8e0e8", wall:"#5a9aaa", label:"" },
  { id:"product", x:420, y:40,  w:480, h:340, floor:"#e8e8e8", wall:"#aaaaaa", label:"Product team" },
  { id:"lounge",  x:420, y:440, w:380, h:320, floor:"#d4c8e8", wall:"#8878b0", label:"Lounge" },
  { id:"cx",      x:960, y:40,  w:420, h:340, floor:"#e8e8e8", wall:"#aaaaaa", label:"CX team" },
  { id:"break",   x:960, y:440, w:420, h:320, floor:"#e8d4c8", wall:"#b08878", label:"Break Room" },
  { id:"server",  x:420, y:820, w:280, h:200, floor:"#c8e8d4", wall:"#78aa88", label:"Server Room" },
];

export default function Game({ user }) {
  const worldRef    = useRef(null);
  const viewportRef = useRef(null);
  const posRef      = useRef({ x: 700, y: 500 });
  const destRef     = useRef(null);          // click-to-move destination
  const keysRef     = useRef({});
  const rafRef      = useRef(null);
  const camRef      = useRef({ x: 0, y: 0 });

  const [pos,         setPos]         = useState({ x: 700, y: 500 });
  const [clickDest,   setClickDest]   = useState(null);
  const [others,      setOthers]      = useState({});
  // chatRooms: roomKey -> { peer, connected: bool }
  const [chatRooms,   setChatRooms]   = useState({});
  // chatHistory: peerId -> [{ from, text, timestamp }]  — persists across reconnects
  const [chatHistory, setChatHistory] = useState({});
  const [activeRoom,  setActiveRoom]  = useState(null);
  const [chatOpen,    setChatOpen]    = useState(false);
  const [proxPeers,   setProxPeers]   = useState({});
  const [muted,       setMuted]       = useState(false);
  const [camOff,      setCamOff]      = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const chatRoomsRef = useRef({});
  chatRoomsRef.current = chatRooms;
  useEffect(() => {
    let lastEmit = 0;

    function loop(ts) {
      const k = keysRef.current;
      let { x, y } = posRef.current;
      let moved = false;

      // Keyboard movement (overrides click destination)
      const kbMoving =
        k["ArrowUp"] || k["w"] || k["W"] ||
        k["ArrowDown"] || k["s"] || k["S"] ||
        k["ArrowLeft"] || k["a"] || k["A"] ||
        k["ArrowRight"] || k["d"] || k["D"];

      if (kbMoving) {
        destRef.current = null; // cancel click destination
        setClickDest(null);
        if (k["ArrowUp"]    || k["w"] || k["W"]) y -= SPEED;
        if (k["ArrowDown"]  || k["s"] || k["S"]) y += SPEED;
        if (k["ArrowLeft"]  || k["a"] || k["A"]) x -= SPEED;
        if (k["ArrowRight"] || k["d"] || k["D"]) x += SPEED;
        moved = true;
      } else if (destRef.current) {
        // Click-to-move: walk toward destination
        const dx = destRef.current.x - x;
        const dy = destRef.current.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < SPEED) {
          x = destRef.current.x;
          y = destRef.current.y;
          destRef.current = null;
          setClickDest(null);
        } else {
          x += (dx / dist) * SPEED;
          y += (dy / dist) * SPEED;
        }
        moved = true;
      }

      x = Math.max(20, Math.min(WORLD_W - 20, x));
      y = Math.max(20, Math.min(WORLD_H - 20, y));

      if (moved) {
        posRef.current = { x, y };
        setPos({ x, y });
        // Throttle socket emit to ~20/s
        if (ts - lastEmit > 50) {
          socket.emit("user:move", { x, y });
          lastEmit = ts;
        }
      }

      // Camera follow
      const vw = viewportRef.current?.clientWidth  || window.innerWidth  - 224;
      const vh = viewportRef.current?.clientHeight || window.innerHeight - 64;
      const cx = Math.max(0, Math.min(WORLD_W - vw, x - vw / 2));
      const cy = Math.max(0, Math.min(WORLD_H - vh, y - vh / 2));
      camRef.current = { x: cx, y: cy };
      if (worldRef.current) worldRef.current.style.transform = `translate(${-cx}px,${-cy}px)`;

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const dn = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      keysRef.current[e.key] = true;
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    };
    const up = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener("keydown", dn);
    window.addEventListener("keyup",   up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  // ── click-to-move handler ─────────────────────────────────────────────
  const handleWorldClick = useCallback((e) => {
    // Convert click position to world coordinates
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldX = e.clientX - rect.left + camRef.current.x;
    const worldY = e.clientY - rect.top  + camRef.current.y;
    const dest = {
      x: Math.max(20, Math.min(WORLD_W - 20, worldX)),
      y: Math.max(20, Math.min(WORLD_H - 20, worldY)),
    };
    destRef.current = dest;
    setClickDest(dest);
  }, []);

  // ── socket ────────────────────────────────────────────────────────────
  useEffect(() => {
    socket.connect();
    socket.emit("user:join", { name: user.name, color: user.color });

    socket.on("users:init", (list) => {
      const map = {};
      list.forEach((u) => {
        if (u.id === socket.id) {
          posRef.current = { x: u.x, y: u.y };
          setPos({ x: u.x, y: u.y });
        } else {
          map[u.id] = u;
        }
      });
      setOthers(map);
      setOnlineUsers(list);
    });

    socket.on("user:joined", (u) => {
      setOthers(p => ({ ...p, [u.id]: u }));
      setOnlineUsers(p => [...p.filter(x => x.id !== u.id), u]);
    });

    socket.on("user:moved", ({ id, x, y }) => {
      setOthers(p => p[id] ? { ...p, [id]: { ...p[id], x, y } } : p);
    });

    socket.on("user:left", (id) => {
      setOthers(p => { const n = { ...p }; delete n[id]; return n; });
      setOnlineUsers(p => p.filter(u => u.id !== id));
      setChatRooms(p => {
        const n = { ...p };
        Object.keys(n).forEach(k => {
          n[k] = { ...n[k], peers: n[k].peers.filter(peer => peer.id !== id) };
          if (n[k].peers.length === 0) delete n[k];
        });
        return n;
      });
    });

    socket.on("chat:connected", ({ roomKey, members, joinedUser }) => {
      const peers = members.filter(m => m.id !== socket.id);

      setChatRooms(prev => {
        const newRooms = { ...prev };
        Object.keys(newRooms).forEach(k => {
          if (k !== roomKey) newRooms[k] = { ...newRooms[k], connected: false };
        });
        newRooms[roomKey] = { peers, connected: true };
        return newRooms;
      });

      setChatHistory(h => {
        let inherited = [];
        let existingPeerIds = new Set();
        Object.entries(h).forEach(([k, msgs]) => {
          if (k === roomKey) return;
          const keyIds = new Set(k.split(":"));
          const overlap = peers.filter(p => keyIds.has(p.id)).length;
          if (overlap > 0 && msgs.length > 0) {
            inherited = [...inherited, ...msgs];
            keyIds.forEach(id => existingPeerIds.add(id));
          }
        });
        const existing = h[roomKey] || [];
        const existingTs = new Set(existing.map(m => m.timestamp));
        const merged = [...existing, ...inherited.filter(m => !existingTs.has(m.timestamp))];
        merged.sort((a, b) => a.timestamp - b.timestamp);
        if (joinedUser && joinedUser.id !== socket.id && merged.length > 0) {
          merged.push({
            type: "system",
            text: `${joinedUser.name} joined the conversation 👋`,
            timestamp: Date.now(),
          });
        }
        return { ...h, [roomKey]: merged };
      });

      // Request persisted history from MongoDB for this room
      socket.emit("chat:history", { roomKey });

      setProxPeers(p => {
        const n = { ...p };
        peers.forEach(peer => { n[peer.id] = roomKey; });
        return n;
      });
      setActiveRoom(roomKey);
      setChatOpen(true);
    });

    // Merge MongoDB history into local state
    socket.on("chat:history", ({ roomKey, messages }) => {
      if (!messages?.length) return;
      setChatHistory(h => {
        const existing = h[roomKey] || [];
        const existingTs = new Set(existing.map(m => m.timestamp));
        const merged = [
          ...messages.filter(m => !existingTs.has(m.timestamp)),
          ...existing,
        ];
        merged.sort((a, b) => a.timestamp - b.timestamp);
        return { ...h, [roomKey]: merged };
      });
    });

    socket.on("group:updated", ({ roomKey, members }) => {
      const peers = members.filter(m => m.id !== socket.id);
      setChatRooms(p => p[roomKey] ? { ...p, [roomKey]: { ...p[roomKey], peers } } : p);
    });

    socket.on("chat:disconnected", ({ roomKey, leftUser }) => {
      // Inject a system message so everyone sees who left
      if (leftUser) {
        setChatHistory(h => ({
          ...h,
          [roomKey]: [...(h[roomKey] || []), {
            type: "system",
            text: `${leftUser.name} left the conversation`,
            timestamp: Date.now(),
          }],
        }));
      }
      setChatRooms(p => {
        if (!p[roomKey]) return p;
        return { ...p, [roomKey]: { ...p[roomKey], connected: false } };
      });
      setProxPeers(p => {
        const n = { ...p };
        Object.keys(n).forEach(k => { if (n[k] === roomKey) delete n[k]; });
        return n;
      });
    });

    // Incoming messages — append to history keyed by roomKey
    socket.on("chat:message", ({ roomKey, from, fromColor, text, timestamp }) => {
      const room = chatRoomsRef.current[roomKey];
      if (!room) return;
      setChatHistory(h => ({
        ...h,
        [roomKey]: [...(h[roomKey] || []), { from, fromColor, text, timestamp }],
      }));
    });

    return () => {
      ["users:init","user:joined","user:moved","user:left","chat:connected","chat:disconnected","chat:message","chat:history"]
        .forEach(ev => socket.off(ev));
      socket.disconnect();
    };
  }, []);

  // peer ids currently in proximity (for bubble on avatar)
  const proxPeerIds = new Set(Object.keys(proxPeers));

  const shownRoom = activeRoom && chatRooms[activeRoom]
    ? activeRoom
    : Object.keys(chatRooms)[0] || null;

  return (
    <div className="flex w-screen h-screen overflow-hidden" style={{ background: "#7ec87e" }}>
      <Sidebar user={user} onlineUsers={onlineUsers} />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0 z-10">
          <span className="font-bold text-gray-700 text-sm">🌐 Virtual Cosmos</span>
          <div className="flex items-center gap-2">
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              🟢 {Object.keys(others).length + 1} online
            </span>
          </div>
        </div>

        {/* Viewport — click here to move */}
        <div
          ref={viewportRef}
          className="flex-1 overflow-hidden relative"
          style={{ cursor: "crosshair" }}
          onClick={handleWorldClick}
        >
          <div
            ref={worldRef}
            className="absolute top-0 left-0"
            style={{ width: WORLD_W, height: WORLD_H, willChange: "transform" }}
          >
            <MapSVG />

            {clickDest && (
              <div
                className="absolute pointer-events-none"
                style={{ left: clickDest.x - 12, top: clickDest.y - 12, zIndex: 20 }}
              >
                <div className="w-6 h-6 rounded-full border-2 border-white opacity-70 animate-ping" />
                <div className="absolute inset-1 rounded-full bg-white opacity-50" />
              </div>
            )}

            {Object.values(others).map(u => (
              <CharAvatar key={u.id} user={u} isSelf={false} showBubble={proxPeerIds.has(u.id)} />
            ))}

            <CharAvatar user={{ ...user, x: pos.x, y: pos.y }} isSelf showBubble={false} />
          </div>
        </div>

        <Toolbar
          user={user}
          muted={muted} setMuted={setMuted}
          camOff={camOff} setCamOff={setCamOff}
          chatRooms={chatRooms}
          chatOpen={chatOpen}
          setChatOpen={setChatOpen}
        />
      </div>

      {/* Chat panel — controlled by chatOpen toggle */}
      {chatOpen && shownRoom && chatRooms[shownRoom] && (
        <ChatPanel
          roomKey={shownRoom}
          peers={chatRooms[shownRoom].peers}
          connected={chatRooms[shownRoom].connected}
          messages={chatHistory[shownRoom] || []}
          myName={user.name}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}

// ─── SVG world map ─────────────────────────────────────────────────────────
function MapSVG() {
  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      width={WORLD_W} height={WORLD_H}
      style={{ zIndex: 0 }}
    >
      <rect width={WORLD_W} height={WORLD_H} fill="#7ec87e" />
      {Array.from({ length: 120 }).map((_, i) => (
        <circle key={i} cx={(i * 173) % WORLD_W} cy={(i * 97 + 50) % WORLD_H}
          r="3" fill="#6ab86a" opacity="0.5" />
      ))}

      <Tree x={30}  y={30}  /><Tree x={100} y={30}  /><Tree x={30}  y={120} />
      <Tree x={30}  y={820} /><Tree x={30}  y={920} /><Tree x={30}  y={1020} />
      <Tree x={1450} y={40} /><Tree x={1530} y={40} />
      <Tree x={1450} y={820}/><Tree x={1530} y={820}/>
      <Tree x={200} y={1100}/><Tree x={300} y={1100}/><Tree x={400} y={1100}/>

      {ROOMS.map(r => <Room key={r.id} {...r} />)}

      <ConfTable x={100} y={120} />
      <Desk x={460} y={100} /><Desk x={560} y={100} /><Desk x={660} y={100} /><Desk x={760} y={100} />
      <Desk x={460} y={220} /><Desk x={560} y={220} /><Desk x={660} y={220} /><Desk x={760} y={220} />
      <Desk x={1000} y={100}/><Desk x={1100} y={100}/><Desk x={1200} y={100}/><Desk x={1300} y={100}/>
      <Desk x={1000} y={220}/><Desk x={1100} y={220}/><Desk x={1200} y={220}/><Desk x={1300} y={220}/>
      <Sofa x={450} y={490} /><Sofa x={650} y={490} dir="right" />
      <PingPong x={470} y={620} />
      <Plant x={420} y={450} /><Plant x={780} y={450} />
      <Sofa x={990}  y={490} /><Sofa x={1190} y={490} dir="right" />
      <Plant x={960} y={450} /><Plant x={1360} y={450} />
      <ellipse cx={1150} cy={600} rx={80} ry={50} fill="#c8a0d0" opacity="0.5" />
      <Desk x={80} y={390} />
      <Bookshelf x={40} y={340} />
      <Plant x={220} y={340} />
      <rect x={50}  y={620} width={30} height={40} rx="4" fill="#e0f0f8" stroke="#aaccdd" strokeWidth="1.5"/>
      <rect x={100} y={620} width={30} height={40} rx="4" fill="#e0f0f8" stroke="#aaccdd" strokeWidth="1.5"/>
      <rect x={50}  y={700} width={60} height={50} rx="6" fill="#d0e8f0" stroke="#aaccdd" strokeWidth="1.5"/>
      <ServerRack x={440} y={850}/><ServerRack x={520} y={850}/><ServerRack x={600} y={850}/>

      <text x={WORLD_W / 2} y={WORLD_H - 16} fontSize="12" fill="#5a9a5a"
        textAnchor="middle" opacity="0.8">
        Click anywhere to move · WASD / Arrow Keys also work · Walk close to someone to chat
      </text>
    </svg>
  );
}

function Room({ x, y, w, h, floor, wall, label }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={floor} stroke={wall} strokeWidth="3" />
      {label && (
        <text x={x + w / 2} y={y + 18} fontSize="11" fill={wall}
          textAnchor="middle" fontWeight="bold" opacity="0.8">{label}</text>
      )}
    </g>
  );
}
function Tree({ x, y }) {
  return (
    <g>
      <circle cx={x+16} cy={y+16} r={18} fill="#3a9a3a"/>
      <circle cx={x+16} cy={y+16} r={12} fill="#4ab84a"/>
      <rect x={x+12} y={y+28} width={8} height={10} fill="#8B4513"/>
    </g>
  );
}
function Desk({ x, y }) {
  return (
    <g>
      <rect x={x} y={y+20} width={72} height={44} rx="3" fill="#8B6914" stroke="#6b4f10" strokeWidth="1.5"/>
      <rect x={x+8}  y={y+4}  width={40} height={28} rx="3" fill="#222" stroke="#444" strokeWidth="1"/>
      <rect x={x+12} y={y+7}  width={32} height={20} fill="#1a3a6a"/>
      <rect x={x+24} y={y+32} width={8}  height={6}  fill="#333"/>
      <rect x={x+10} y={y+44} width={30} height={8}  rx="1" fill="#ccc" stroke="#aaa" strokeWidth="0.5"/>
      <rect x={x+18} y={y+68} width={28} height={24} rx="12" fill="#555" stroke="#333" strokeWidth="1"/>
    </g>
  );
}
function ConfTable({ x, y }) {
  return (
    <g>
      <rect x={x} y={y} width={200} height={100} rx="8" fill="#8B6914" stroke="#6b4f10" strokeWidth="2"/>
      {[0,50,100,150].map(ox => (
        <rect key={`t${ox}`} x={x+ox+10} y={y-18} width={28} height={18} rx="6" fill="#c84a4a" stroke="#a03030" strokeWidth="1"/>
      ))}
      {[0,50,100,150].map(ox => (
        <rect key={`b${ox}`} x={x+ox+10} y={y+100} width={28} height={18} rx="6" fill="#c84a4a" stroke="#a03030" strokeWidth="1"/>
      ))}
      <rect x={x+80} y={y+30} width={40} height={28} rx="2" fill="#222"/>
      <rect x={x+83} y={y+33} width={34} height={20} fill="#1a3a6a"/>
    </g>
  );
}
function Sofa({ x, y, dir }) {
  const flip = dir === "right" ? -1 : 1;
  const ox   = dir === "right" ? 140 : 0;
  return (
    <g transform={`translate(${x+ox},${y}) scale(${flip},1)`}>
      <rect x={0}   y={10} width={140} height={60} rx="8" fill="#e8a050" stroke="#c07030" strokeWidth="1.5"/>
      <rect x={0}   y={0}  width={140} height={20} rx="6" fill="#f0b060" stroke="#c07030" strokeWidth="1"/>
      <rect x={0}   y={10} width={20}  height={60} rx="6" fill="#f0b060" stroke="#c07030" strokeWidth="1"/>
      <rect x={120} y={10} width={20}  height={60} rx="6" fill="#f0b060" stroke="#c07030" strokeWidth="1"/>
    </g>
  );
}
function PingPong({ x, y }) {
  return (
    <g>
      <rect x={x} y={y} width={180} height={90} rx="4" fill="#2a8a2a" stroke="#1a6a1a" strokeWidth="2"/>
      <line x1={x+90} y1={y} x2={x+90} y2={y+90} stroke="white" strokeWidth="2"/>
      <line x1={x} y1={y+45} x2={x+180} y2={y+45} stroke="white" strokeWidth="1" strokeDasharray="6,4"/>
      <rect x={x+86} y={y+30} width={8} height={30} fill="#ccc" stroke="#aaa" strokeWidth="1"/>
      <circle cx={x+30}  cy={y+70} r={10} fill="#e84040"/>
      <circle cx={x+150} cy={y+20} r={10} fill="#4040e8"/>
    </g>
  );
}
function Plant({ x, y }) {
  return (
    <g>
      <rect   x={x+6}  y={y+20} width={20} height={18} rx="3" fill="#8B6914" stroke="#6b4f10" strokeWidth="1"/>
      <circle cx={x+16} cy={y+14} r={14} fill="#2a8a2a"/>
      <circle cx={x+8}  cy={y+10} r={8}  fill="#3a9a3a"/>
      <circle cx={x+24} cy={y+10} r={8}  fill="#3a9a3a"/>
    </g>
  );
}
function Bookshelf({ x, y }) {
  return (
    <g>
      <rect x={x} y={y} width={60} height={80} fill="#8B6914" stroke="#6b4f10" strokeWidth="1.5"/>
      {[0,1,2,3].map(row => [0,1,2].map(col => (
        <rect key={`${row}${col}`} x={x+4+col*18} y={y+4+row*18} width={14} height={14}
          fill={["#e84040","#4040e8","#40a040","#e8a040"][(row*3+col)%4]}
          stroke="#333" strokeWidth="0.5"/>
      )))}
    </g>
  );
}
function ServerRack({ x, y }) {
  return (
    <g>
      <rect x={x} y={y} width={60} height={100} rx="2" fill="#333" stroke="#555" strokeWidth="1.5"/>
      {[0,1,2,3,4].map(i => (
        <g key={i}>
          <rect x={x+4} y={y+8+i*18} width={52} height={12} rx="1" fill="#444" stroke="#666" strokeWidth="0.5"/>
          <circle cx={x+50} cy={y+14+i*18} r={3} fill={i%2===0?"#00ff88":"#ff4444"}/>
        </g>
      ))}
    </g>
  );
}

// ─── Pixel-art character ───────────────────────────────────────────────────
function CharAvatar({ user, isSelf, showBubble }) {
  const idx   = ci(user.color);
  const skin  = SKIN[idx];
  const hair  = HAIR[idx];
  const shirt = user.color;

  return (
    <div
      className="absolute flex flex-col items-center select-none"
      style={{
        left: user.x - 16,
        top:  user.y - 40,
        zIndex: 10,
        pointerEvents: "none",
        transition: isSelf ? "none" : "left 0.08s linear, top 0.08s linear",
      }}
    >
      {showBubble && (
        <div className="mb-1 bg-white rounded-xl px-2 py-1 shadow text-gray-700 font-bold border border-gray-200"
          style={{ fontSize: 13, letterSpacing: 3 }}>
          •••
        </div>
      )}

      <svg width={32} height={48} viewBox="0 0 32 48">
        <ellipse cx={16} cy={46} rx={10} ry={3} fill="black" opacity="0.15"/>
        <rect x={9}  y={32} width={6}  height={12} rx="2" fill={shirt} opacity="0.8"/>
        <rect x={17} y={32} width={6}  height={12} rx="2" fill={shirt} opacity="0.8"/>
        <rect x={8}  y={42} width={8}  height={4}  rx="2" fill="#222"/>
        <rect x={16} y={42} width={8}  height={4}  rx="2" fill="#222"/>
        <rect x={7}  y={18} width={18} height={16} rx="3" fill={shirt}/>
        <rect x={1}  y={19} width={6}  height={10} rx="2" fill={skin}/>
        <rect x={25} y={19} width={6}  height={10} rx="2" fill={skin}/>
        <rect x={13} y={14} width={6}  height={6}  fill={skin}/>
        <rect x={6}  y={4}  width={20} height={18} rx="5" fill={skin}/>
        <rect x={6}  y={4}  width={20} height={8}  rx="5" fill={hair}/>
        <rect x={6}  y={4}  width={5}  height={14} rx="2" fill={hair}/>
        <rect x={10} y={13} width={4}  height={4}  rx="1" fill="#222"/>
        <rect x={18} y={13} width={4}  height={4}  rx="1" fill="#222"/>
        <rect x={11} y={13} width={2}  height={2}  fill="white" opacity="0.7"/>
        <rect x={19} y={13} width={2}  height={2}  fill="white" opacity="0.7"/>
        {isSelf && <rect x={4} y={2} width={24} height={22} rx="6" fill="none" stroke="white" strokeWidth="1.5" opacity="0.7"/>}
      </svg>

      <div
        className="mt-0.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-semibold whitespace-nowrap shadow"
        style={{ background: "rgba(20,20,20,0.75)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
        {user.name}{isSelf && <span className="text-gray-400 font-normal ml-0.5">(You)</span>}
      </div>
    </div>
  );
}
