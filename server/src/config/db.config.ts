import mongoose from "mongoose";
import { env } from "./env.config";

const connectDB = async () => {
  try {
    // serverSelectionTimeoutMS is crucial for Cloud Run
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, 
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn; // Return connection for safety
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1); 
  }
};

export default connectDB;
