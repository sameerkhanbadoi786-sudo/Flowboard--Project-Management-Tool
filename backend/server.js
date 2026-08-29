import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import authRoutes from "./routes/auth.js";
import projectRoutesFactory from "./routes/projects.js";
import notificationRoutesFactory from "./routes/notifications.js";
import { JWT_SECRET } from "./middleware/auth.js";
import { userProjects } from "./store.js";

const app = express();

// Defaults to the local Vite dev server (see README: `npm run dev` serves on
// :5174). Set FRONTEND_ORIGIN in backend/.env when you deploy, to your real
// frontend URL (e.g. https://flowboard.yourdomain.com) — comma-separate
// multiple origins if you need more than one (e.g. staging + production).
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim());

const corsOptions = {
  origin(origin, callback) {
    // `origin` is undefined for same-origin requests, curl, and server-to-server
    // calls with no Origin header — allow those through.
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 5001;

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });

// Routes need `io` so they can broadcast board updates on every mutation.
app.use("/api/projects", projectRoutesFactory(io));
app.use("/api/notifications", notificationRoutesFactory());

// Clean 403 instead of Express's default 500 + stack-trace HTML page when a
// disallowed origin gets rejected by the CORS check above.
app.use((err, req, res, next) => {
  if (err && err.message?.startsWith("Not allowed by CORS")) {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  next(err);
});

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return next(new Error("Unauthorized"));
  socket.user = { id: payload.id, username: payload.username };
  next();
});

io.on("connection", (socket) => {
  // A user might have several projects open across tabs — join a personal
  // room too, so we can push cross-project notifications (e.g. "you were
  // assigned a card") without them needing to be on that project's board.
  socket.join(`user:${socket.user.username}`);

  socket.on("join-project", (projectId) => {
    const memberOf = userProjects(socket.user.username).some((p) => p.id === projectId);
    if (!memberOf) return; // silently ignore — not a member
    socket.join(`project:${projectId}`);
  });

  socket.on("leave-project", (projectId) => {
    socket.leave(`project:${projectId}`);
  });

  socket.on("card-comment-typing", ({ projectId, cardId }) => {
    socket.to(`project:${projectId}`).emit("card-comment-typing", {
      cardId,
      username: socket.user.username,
    });
  });
});

server.listen(PORT, () => {
  console.log(`Project management API running on http://localhost:${PORT}`);
});
