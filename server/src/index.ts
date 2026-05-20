import express from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import { env } from "./config/env.config";
import connectDB from "./config/db.config";
import v1Routes from "./routes/v1/index";
import errorHandlerMiddleware from "./middlewares/errorHandler";
import notFoundMiddleware from "./middlewares/notFound";
import cookieParser from "cookie-parser";
import { initPendingOnboardingReminderJob } from "./modules/onboarding/jobs/pendingOnboardingReminder.job";

dotenv.config();

const app = express();

const normalizeOrigin = (value: string) => value.replace(/\/$/, "");

const allowedOrigins = new Set(
  [
    "http://localhost:5173",
    "http://localhost:3000",
    env.FRONTEND_URL,
    ...(env.CORS_ORIGINS?.split(",").map((origin) => origin.trim()) ?? []),
  ]
    .filter(Boolean)
    .map(normalizeOrigin),
);

if (env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeOrigin(origin);

    if (
      allowedOrigins.has(normalizedOrigin) ||
      normalizedOrigin.includes("ngrok")
    ) {
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

// Raw body for Stripe webhooks (must be before JSON middleware)
app.use("/api/v1/billing/webhook", express.raw({ type: "application/json" }));

// Fully intercept and preserve RAW body for all Slack routes (Events and Interactions)
app.use("/api/v1/slack/events", express.raw({ type: "application/json" }));
app.use(
  "/api/v1/slack-game/interactions",
  express.raw({ type: "application/x-www-form-urlencoded" }),
);
app.use(
  "/api/v1/slack-game/commands",
  express.raw({ type: "application/x-www-form-urlencoded" }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", v1Routes);

app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

const args = process.argv.slice(2);
const portArgIndex = args.indexOf("--port");
const PORT = portArgIndex !== -1 ? Number(args[portArgIndex + 1]) : env.PORT;

const server = createServer(app);

const startServer = async () => {
  try {
    await connectDB();

    // Initialize cron jobs
    initPendingOnboardingReminderJob("0 9 * * *");

    server.listen(PORT, () => {
      console.log(`Server live in ${env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
