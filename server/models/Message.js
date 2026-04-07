import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  roomId:    { type: String, required: true, index: true },
  from:      { type: String, required: true },
  fromColor: { type: String, default: "#60a5fa" },
  text:      { type: String, required: true },
  timestamp: { type: Number, default: () => Date.now() },
});

export default mongoose.model("Message", messageSchema);
