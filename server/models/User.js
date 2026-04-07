import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  color:    { type: String, default: "#60a5fa" },
  x:        { type: Number, default: 700 },
  y:        { type: Number, default: 500 },
  lastSeen: { type: Date,   default: Date.now },
});

export default mongoose.model("User", userSchema);
