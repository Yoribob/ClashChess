const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config({ override: true });
const { initDb } = require("./config/db");
const errorHandler = require("./middleware/errorMiddleware");

const PORT = process.env.PORT || 3000;
const app = express();
const httpServer = http.createServer(app);

const corsOriginFn = (origin, callback) => {
  if (
    !origin ||
    origin === "http://localhost:5173" ||
    origin.endsWith(".vercel.app")
  ) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};

const io = new Server(httpServer, {
  cors: {
    origin: corsOriginFn,
    credentials: true,
  },
});

app.set("trust proxy", 1);

app.use(
  cors({
    origin: corsOriginFn,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/reg", require("./routes/regRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/refresh-token", require("./routes/refreshRoutes"));
app.use("/api/logout", require("./routes/logoutRoutes"));
app.use("/api/avatar", require("./routes/avatarRoutes"));
app.use("/api/lobby", require("./routes/lobbyRoutes"));

app.use(errorHandler);

(async function start() {
  try {
    await initDb();
    const { lobbySocket } = require("./sockets/lobbySocket");
    lobbySocket(io);
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
