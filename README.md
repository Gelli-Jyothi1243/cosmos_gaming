# Virtual Cosmos

A real-time 2D virtual environment where users can move freely and interact with others based on proximity.

When users come close → chat connects
When users move away → chat disconnects

---

## Features

* 2D Virtual Space
  Smooth movement using keyboard (WASD / Arrow keys) and mouse click
  Camera follows the player

* Real-Time Multiplayer
  Multiple users visible simultaneously
  Live position sync using Socket.IO

* Proximity-Based Interaction
  Users automatically connect when within a defined radius
  Disconnect when moving apart

* Chat System
  Auto-join chat when nearby users
  Auto-leave when out of range
  Supports group chats (multiple users)

* Room Handling
  Dynamic room creation based on proximity
  Each room maintains its own chat history

* Persistent Messaging
  Chat messages stored in MongoDB
  History loaded when users reconnect

* UI/UX
  Sidebar with online users
  Avatar system
  Chat panel with real-time updates

---

## Tech Stack

### Frontend

* React (Vite)
* Tailwind CSS

### Backend

* Node.js
* Express
* Socket.IO

### Database

* MongoDB

---

## Setup & Run

### Backend (Server)

```bash
cd server
npm install
npm run dev
```

Runs on:

```
http://localhost:3001
```

---

### Frontend (Client)

```bash
cd client
npm install
npm run dev
```

Runs on:

```
http://localhost:5173
```

---

## How to Test

1. Open the application in browser
2. Open multiple tabs/windows
3. Enter different usernames
4. Move users around

Test cases:

* Users can see each other in real-time
* Move closer → chat connects
* Send messages
* Move away → chat disconnects

---

## System Design Overview

* Real-time communication using Socket.IO
* User positions stored in server memory
* Proximity detection using distance-based logic
* Chat rooms created dynamically
* MongoDB used for storing chat history

---

## Demo

A demo video demonstrates:

* User movement
* Real-time interaction
* Chat connect/disconnect
* Message persistence

---

## Notes

* Open multiple tabs to simulate multiple users
* Start backend before frontend
* MongoDB required for chat storage

---

## Author

Jyothi Gelli
B.Tech IT Student

---

