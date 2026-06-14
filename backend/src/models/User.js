import mongoose from "mongoose";
import { SUPPORTED_STOCKS } from "../data/stocks.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true
    },
    subscriptions: {
      type: [String],
      enum: SUPPORTED_STOCKS,
      default: []
    }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
