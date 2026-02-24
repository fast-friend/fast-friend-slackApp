import express from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import { env } from "./config/env.config";
import connectDB from "./config/db.config";
import v1Routes from "./routes/v1/index";
import errorHandlerMiddleware from "./middlewares/errorHandler";
import notFoundMiddleware from "./middlewares/notFound";
import cookieParser from "cookie-parser";
import { initDailyGameJob } from "./modules/slack-game";
import { seedGameTemplates } from "./modules/groups/services/gameTemplate.service";

dotenv.config();

connectDB();

const app = express();

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow localhost and ngrok URLs
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      env.FRONTEND_URL,
    ];

    if (allowedOrigins.includes(origin) || origin.includes("ngrok")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "X-VERIFY", "x-verify"],
};

app.use(cors(corsOptions));

app.use(cookieParser());

// Preserve raw body for Slack signature verification
// This MUST come before express.json() and express.urlencoded()
app.use(
  "/api/v1/slack-game/interactions",
  express.raw({ type: "application/x-www-form-urlencoded" }),
);

// Apply express.json() to all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", v1Routes);

if (env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "..", "..", "client", "dist");
  app.use(express.static(buildPath));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(buildPath, "index.html"));
  });
}

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const args = process.argv.slice(2);
const portArgIndex = args.indexOf("--port");
const PORT = portArgIndex !== -1 ? Number(args[portArgIndex + 1]) : env.PORT;

const server = createServer(app);

server.listen(PORT, async () => {
  console.log(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);

  // Seed game templates on startup
  await seedGameTemplates();

  // Initialize game cron job (runs every hour to check scheduled games)
  initDailyGameJob("* * * * *"); // Every hour
});
