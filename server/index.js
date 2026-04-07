import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Message from "./models/Message.js";
import User from "./models/User.js";

dotenv.config();

// ── MongoDB ────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err.message));

// ── Express + Socket.IO ────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

// ── REST: fetch chat history for a room ────────────────────────────────────
app.get("/history/:roomId", async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.roomId })
      .sort({ timestamp: 1 })
      .limit(100);
    res.json(messages);
  } catch {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ── In-memory state ────────────────────────────────────────────────────────
const users    = new Map(); // socketId -> { id, name, color, x, y, dbId }
const chatRooms = new Map(); // roomKey -> Set<socketId>
const userRoom  = new Map(); // socketId -> roomKey

const PROXIMITY_RADIUS = 150;

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}
function makeRoomKey(ids) {
  return [...ids].sort().join(":");
}
function getCluster(seedId) {
  const cluster = new Set([seedId]);
  const queue = [seedId];
  while (queue.length) {
    const cur = queue.shift();
    const curUser = users.get(cur);
    if (!curUser) continue;
    for (const [otherId, other] of users) {
      if (cluster.has(otherId)) continue;
      if (dist(curUser, other) < PROXIMITY_RADIUS) {
        cluster.add(otherId);
        queue.push(otherId);
      }
    }
  }
  return cluster;
}

function removeFromRoom(socketId) {
  const oldKey = userRoom.get(socketId);
  if (!oldKey) return null;
  const room = chatRooms.get(oldKey);
  if (room) {
    room.delete(socketId);
    if (room.size === 0) chatRooms.delete(oldKey);
  }
  const sock = io.sockets.sockets.get(socketId);
  if (sock) sock.leave(oldKey);
  userRoom.delete(socketId);
  return oldKey;
}

function formRoom(memberIds, joinedId = null) {
  if (memberIds.size < 2) return;
  const newKey = makeRoomKey(memberIds);
  const alreadyIn = [...memberIds].every(id => userRoom.get(id) === newKey);
  if (alreadyIn) return;

  if (!chatRooms.has(newKey)) chatRooms.set(newKey, new Set());
  const room = chatRooms.get(newKey);
  const memberUsers = [];
  for (const id of memberIds) {
    room.add(id);
    userRoom.set(id, newKey);
    const sock = io.sockets.sockets.get(id);
    if (sock) sock.join(newKey);
    const u = users.get(id);
    if (u) memberUsers.push(u);
  }
  const joinedUser = joinedId ? users.get(joinedId) : null;
  io.to(newKey).emit("chat:connected", {
    roomKey: newKey,
    members: memberUsers,
    joinedUser: joinedUser || null,
  });
}

function checkProximity(movedId) {
  const mover = users.get(movedId);
  if (!mover) return;

  const affectedIds = new Set([movedId]);
  const oldKey = userRoom.get(movedId);
  if (oldKey) {
    const oldRoom = chatRooms.get(oldKey);
    if (oldRoom) oldRoom.forEach(id => affectedIds.add(id));
  }
  for (const [otherId, other] of users) {
    if (dist(mover, other) < PROXIMITY_RADIUS) affectedIds.add(otherId);
  }

  const visited = new Set();
  const clusters = [];
  for (const id of affectedIds) {
    if (visited.has(id)) continue;
    const cluster = getCluster(id);
    cluster.forEach(cid => visited.add(cid));
    clusters.push(cluster);
  }

  for (const cluster of clusters) {
    const newKey = makeRoomKey(cluster);
    if (cluster.size < 2) {
      for (const cid of cluster) {
        const prevKey = userRoom.get(cid);
        if (prevKey) {
          const leavingUser = users.get(cid);
          removeFromRoom(cid);
          const sock = io.sockets.sockets.get(cid);
          if (sock) sock.emit("chat:disconnected", { roomKey: prevKey, leftUser: null });
          if (chatRooms.has(prevKey)) {
            io.to(prevKey).emit("chat:disconnected", { roomKey: prevKey, leftUser: leavingUser });
          }
        }
      }
      continue;
    }

    const alreadyCorrect = [...cluster].every(cid => userRoom.get(cid) === newKey);
    if (alreadyCorrect) continue;

    const oldRooms = new Map();
    for (const cid of cluster) {
      const prevKey = userRoom.get(cid);
      if (prevKey && prevKey !== newKey) {
        if (!oldRooms.has(prevKey)) oldRooms.set(prevKey, new Set());
        oldRooms.get(prevKey).add(cid);
      }
    }
    for (const cid of cluster) removeFromRoom(cid);
    for (const [prevKey, leavingMembers] of oldRooms) {
      for (const cid of leavingMembers) {
        const leavingUser = users.get(cid);
        if (chatRooms.has(prevKey)) {
          io.to(prevKey).emit("chat:disconnected", { roomKey: prevKey, leftUser: leavingUser });
        }
      }
    }

    formRoom(cluster, movedId);

    for (const [prevKey] of oldRooms) {
      const remaining = chatRooms.get(prevKey);
      if (!remaining || remaining.size === 0) continue;
      const remainingIds = [...remaining];
      for (const rid of remainingIds) {
        if (visited.has(rid)) continue;
        const rCluster = getCluster(rid);
        rCluster.forEach(cid => visited.add(cid));
        if (rCluster.size < 2) {
          for (const cid of rCluster) {
            const rPrevKey = userRoom.get(cid);
            if (rPrevKey) {
              const leavingUser = users.get(cid);
              removeFromRoom(cid);
              const sock = io.sockets.sockets.get(cid);
              if (sock) sock.emit("chat:disconnected", { roomKey: rPrevKey, leftUser: null });
              if (chatRooms.has(rPrevKey)) {
                io.to(rPrevKey).emit("chat:disconnected", { roomKey: rPrevKey, leftUser: leavingUser });
              }
            }
          }
        } else {
          const rNewKey = makeRoomKey(rCluster);
          const rAlreadyCorrect = [...rCluster].every(cid => userRoom.get(cid) === rNewKey);
          if (!rAlreadyCorrect) {
            for (const cid of rCluster) removeFromRoom(cid);
            formRoom(rCluster);
          }
        }
      }
    }
  }
}

// ── Socket.IO ──────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("user:join", async ({ name, color }) => {
    // Save/update user in MongoDB
    let dbUser;
    try {
      dbUser = await User.findOneAndUpdate(
        { name },
        { name, color, lastSeen: new Date() },
        { upsert: true, new: true }
      );
    } catch { /* non-critical */ }

    const user = {
      id: socket.id,
      name,
      color,
      x: 600 + Math.random() * 200,
      y: 400 + Math.random() * 150,
      dbId: dbUser?._id?.toString(),
    };
    users.set(socket.id, user);
    socket.emit("users:init", Array.from(users.values()));
    socket.broadcast.emit("user:joined", user);
    checkProximity(socket.id);
  });

  socket.on("user:move", ({ x, y }) => {
    const user = users.get(socket.id);
    if (!user) return;
    user.x = x;
    user.y = y;
    socket.broadcast.emit("user:moved", { id: socket.id, x, y });
    checkProximity(socket.id);
  });

  socket.on("chat:message", async ({ roomKey, text }) => {
    const user = users.get(socket.id);
    if (!user) return;
    const room = chatRooms.get(roomKey);
    if (!room || !room.has(socket.id)) return;

    const payload = {
      roomKey,
      from: user.name,
      fromColor: user.color,
      text,
      timestamp: Date.now(),
    };

    // Persist to MongoDB
    try {
      await Message.create({
        roomId:    roomKey,
        from:      user.name,
        fromColor: user.color,
        text,
        timestamp: payload.timestamp,
      });
    } catch { /* non-critical */ }

    io.to(roomKey).emit("chat:message", payload);
  });

  // Client requests history for a room on reconnect
  socket.on("chat:history", async ({ roomKey }) => {
    try {
      const messages = await Message.find({ roomId: roomKey })
        .sort({ timestamp: 1 })
        .limit(100)
        .lean();
      socket.emit("chat:history", { roomKey, messages });
    } catch { /* non-critical */ }
  });

  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (!user) return;

    // Update lastSeen in MongoDB
    if (user.dbId) {
      User.findByIdAndUpdate(user.dbId, { lastSeen: new Date(), x: user.x, y: user.y })
        .catch(() => {});
    }

    const oldKey = userRoom.get(socket.id);
    const leavingUser = { ...user };
    removeFromRoom(socket.id);
    users.delete(socket.id);
    io.emit("user:left", socket.id);

    if (oldKey) {
      const remaining = chatRooms.get(oldKey);
      if (remaining && remaining.size > 0) {
        io.to(oldKey).emit("chat:disconnected", { roomKey: oldKey, leftUser: leavingUser });
        const remainingIds = [...remaining];
        const visited = new Set();
        for (const rid of remainingIds) {
          if (visited.has(rid)) continue;
          const rCluster = getCluster(rid);
          rCluster.forEach(id => visited.add(id));
          if (rCluster.size < 2) {
            for (const cid of rCluster) {
              const rPrevKey = userRoom.get(cid);
              if (rPrevKey) {
                removeFromRoom(cid);
                const sock = io.sockets.sockets.get(cid);
                if (sock) sock.emit("chat:disconnected", { roomKey: rPrevKey, leftUser: null });
              }
            }
          } else {
            const rNewKey = makeRoomKey(rCluster);
            const alreadyCorrect = [...rCluster].every(cid => userRoom.get(cid) === rNewKey);
            if (!alreadyCorrect) {
              for (const cid of rCluster) removeFromRoom(cid);
              formRoom(rCluster);
            }
          }
        }
      }
    }

    console.log("disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
