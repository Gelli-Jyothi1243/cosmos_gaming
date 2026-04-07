import { useEffect, useRef, useState } from "react";
import socket from "../socket.js";

export default function ChatPanel({ roomKey, peers = [], connected, messages = [], myName, onClose }) {
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const isGroup   = peers.length > 1;

  const EMOJIS = ["👋","😄","😂","❤️","👍","🔥","🎉","😮","😢","🤔","💯","✅"];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || !connected) return;
    socket.emit("chat:message", { roomKey, text: input.trim() });
    setInput("");
    setShowEmoji(false);
    inputRef.current?.focus();
  }

  function addEmoji(em) {
    setInput(v => v + em);
    setShowEmoji(false);
    inputRef.current?.focus();
  }

  const title = isGroup ? `Group · ${peers.length + 1} people` : peers[0]?.name || "Chat";
  const subtitle = connected
    ? isGroup ? peers.map(p => p.name).join(", ") : "In proximity"
    : "Out of range — walk closer";

  return (
    <div className="w-80 flex flex-col shrink-0 shadow-2xl overflow-hidden"
      style={{ background: "#f0f2f5" }}>

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>

        {/* Avatar stack */}
        <div className="flex -space-x-2 shrink-0">
          {peers.slice(0, 3).map((p, i) => (
            <div key={p.id}
              className="w-9 h-9 rounded-full border-2 border-white/50 flex items-center justify-center text-white text-sm font-bold shadow-sm"
              style={{ background: p.color || "#6b7280", zIndex: 3 - i }}>
              {p.name[0].toUpperCase()}
            </div>
          ))}
          {peers.length === 0 && (
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white text-lg">
              💬
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-300 animate-pulse" : "bg-gray-400"}`} />
            <p className="text-white/70 text-[10px] truncate">{subtitle}</p>
          </div>
        </div>

        <button onClick={onClose}
          className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white text-sm transition-colors shrink-0">
          ✕
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.03) 1px, transparent 0)", backgroundSize: "20px 20px" }}>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-8">
            <div className="text-4xl">
              {connected ? (isGroup ? "👥" : "👋") : "🚶"}
            </div>
            <p className="text-gray-500 text-sm text-center font-medium">
              {connected
                ? isGroup ? "Group chat started!" : `You're chatting with ${peers[0]?.name}`
                : "Walk closer to start chatting"}
            </p>
            {connected && (
              <p className="text-gray-400 text-xs text-center">Say something nice 😊</p>
            )}
          </div>
        ) : (
          messages.map((msg, i) => {
            // System message
            if (msg.type === "system") {
              return (
                <div key={i} className="flex justify-center my-3">
                  <span className="text-[11px] text-gray-500 bg-white/80 px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isSelf = msg.from === myName;
            const prev   = messages[i - 1];
            const next   = messages[i + 1];
            const isFirst = !prev || prev.from !== msg.from || prev.type === "system";
            const isLast  = !next || next.from !== msg.from || next.type === "system";
            const showName = isGroup && !isSelf && isFirst;
            const showTime = isLast;

            return (
              <div key={i} className={`flex flex-col ${isSelf ? "items-end" : "items-start"} ${isFirst ? "mt-2" : "mt-0.5"}`}>
                {showName && (
                  <span className="text-[11px] font-bold ml-10 mb-1"
                    style={{ color: msg.fromColor || "#6b7280" }}>
                    {msg.from}
                  </span>
                )}

                <div className={`flex items-end gap-2 max-w-[85%] ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Avatar (others only, last in group) */}
                  {!isSelf && isGroup && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${isLast ? "opacity-100" : "opacity-0"}`}
                      style={{ background: msg.fromColor || "#6b7280" }}>
                      {msg.from[0].toUpperCase()}
                    </div>
                  )}

                  {/* Bubble */}
                  <div className={`relative px-3.5 py-2.5 shadow-sm ${
                    isSelf
                      ? "rounded-2xl rounded-br-sm bg-gradient-to-br from-blue-500 to-purple-600 text-white"
                      : "rounded-2xl rounded-bl-sm bg-white text-gray-900"
                  }`}>
                    <p className="text-sm leading-relaxed break-words">{msg.text}</p>
                    {showTime && (
                      <p className={`text-[9px] mt-1 ${isSelf ? "text-white/60 text-right" : "text-gray-400"}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {isSelf && " ✓✓"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Emoji picker ── */}
      {showEmoji && (
        <div className="px-3 py-2 bg-white border-t border-gray-100 flex flex-wrap gap-1.5">
          {EMOJIS.map(em => (
            <button key={em} onClick={() => addEmoji(em)}
              className="text-xl hover:scale-125 transition-transform active:scale-110">
              {em}
            </button>
          ))}
        </div>
      )}

      {/* ── Input ── */}
      <div className="px-3 py-3 bg-white border-t border-gray-100 shrink-0">
        {!connected && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-2">
            <span className="text-amber-500 text-sm">🚶</span>
            <p className="text-amber-700 text-xs font-medium">Walk closer to send messages</p>
          </div>
        )}
        <form onSubmit={sendMessage} className="flex items-center gap-2">
          <button type="button" onClick={() => setShowEmoji(v => !v)}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-base transition-colors shrink-0">
            😊
          </button>
          <input
            ref={inputRef}
            className={`flex-1 rounded-full px-4 py-2.5 text-sm focus:outline-none transition-all ${
              connected
                ? "bg-gray-100 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-purple-300"
                : "bg-gray-50 text-gray-400 cursor-not-allowed"
            }`}
            placeholder={connected ? "Type a message..." : "Out of range..."}
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={!connected}
            autoFocus={connected}
          />
          <button type="submit" disabled={!input.trim() || !connected}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm transition-all shrink-0 ${
              input.trim() && connected
                ? "shadow-md active:scale-95"
                : "opacity-40 cursor-not-allowed"
            }`}
            style={{ background: input.trim() && connected ? "linear-gradient(135deg,#667eea,#764ba2)" : "#9ca3af" }}>
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}
