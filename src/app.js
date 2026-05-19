require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/database");
const { createServer } = require("http");
const { authRouter } = require("./routes/auth");
const { profileRouter } = require("./routes/profile");
const { requestsRouter } = require("./routes/requests");
const { settingsRouter } = require("./routes/settings");
const { userRouter } = require("./routes/user");
const { premiumRouter } = require("./routes/premium");
const { chatRouter } = require("./routes/chat");
const { notificationsRouter } = require("./routes/notifications");
const { initializeSocket } = require("./utils/sockets");

const app = express();
const httpServer = createServer(app);
initializeSocket(httpServer);

app.use(cors({
    origin: [
        "http://localhost:3000",
        "https://devtinder-ai.vercel.app",
        "https://dev-tinder.up.railway.app",
        "https://devtinder-production-0246.up.railway.app",
    ],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 3001;

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestsRouter);
app.use("/", settingsRouter);
app.use("/", userRouter);
app.use("/", premiumRouter);
app.use("/", chatRouter);
app.use("/", notificationsRouter);

connectDB().then(() => {
    console.log('Database connected successfully');
    httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT} http://localhost:${PORT}`);
    });
}).catch((err) => {
    console.log(err);
});

module.exports = app;
