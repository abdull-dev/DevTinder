require("dotenv").config();
const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/database");
const { authRouter } = require("./routes/auth");
const { profileRouter } = require("./routes/profile");
const { requestsRouter } = require("./routes/requests");
const { settingsRouter } = require("./routes/settings");
const { userRouter } = require("./routes/user");
const { premiumRouter } = require("./routes/premium");
const { chatRouter } = require("./routes/chat");
const { initializeSocket } = require("./socket");

const app = express();
const server = http.createServer(app);

const corsOptions = {
    origin: ["http://localhost:3000", "https://dev-tinder-sage.vercel.app", "https://devtinder-ai.vercel.app"],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
const uploadsDir = process.env.VERCEL === "1" ? "/tmp" : path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsDir));

const PORT = process.env.PORT || 3001;

// Connect DB on first request (for serverless)
let isConnected = false;
app.use(async (req, res, next) => {
    if (!isConnected) {
        await connectDB();
        isConnected = true;
    }
    next();
});

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestsRouter);
app.use("/", settingsRouter);
app.use("/", userRouter);
app.use("/", premiumRouter);
app.use("/", chatRouter);

// Initialize Socket.io
initializeSocket(server, corsOptions);

// Start server only when running locally (not on Vercel)
if (process.env.VERCEL !== "1") {
    connectDB().then(() => {
        console.log('Database connected successfully');
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT} http://localhost:${PORT}`);
        });
    }).catch((err) => {
        console.log(err);
    });
}

module.exports = app;
