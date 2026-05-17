const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/database");
const { authRouter } = require("./routes/auth");
const { profileRouter } = require("./routes/profile");
const { requestsRouter } = require("./routes/requests");
const { settingsRouter } = require("./routes/settings");
const { userRouter } = require("./routes/user");
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const PORT = process.env.PORT || 3001;

app.use("/", authRouter);
app.use("/", profileRouter);
app.use("/", requestsRouter);
app.use("/", settingsRouter);
app.use("/", userRouter);

connectDB().then(() => {
    console.log('Database connected successfully');
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT} http://localhost:${PORT}`);
    });
}).catch((err) => {
    console.log(err);
});