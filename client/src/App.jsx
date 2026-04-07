import React, { useState } from "react";
import NameModal from "./components/NameModal.jsx";
import Game from "./components/Game.jsx";

const COLORS = ["#f87171","#fb923c","#facc15","#4ade80","#60a5fa","#c084fc","#f472b6","#34d399"];

export default function App() {
  const [user, setUser] = useState(null);

  function handleJoin({ name, colorIdx }) {
    setUser({ name, color: COLORS[colorIdx] });
  }

  if (!user) return <NameModal onJoin={handleJoin} />;
  return <Game user={user} />;
}
