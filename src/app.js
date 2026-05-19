require("dotenv").config();
const express = require("express");
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
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        // Allow all origins
        callback(null, origin);
    },
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

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
