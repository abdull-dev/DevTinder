const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const Message = require("./models/message");
const userModel = require("./models/user");

// Track online users: userId -> socketId
const onlineUsers = new Map();

function initializeSocket(server, corsOptions) {
    const io = new Server(server, {
        cors: corsOptions,
    });

    // Auth middleware - verify JWT from cookie
    io.use(async (socket, next) => {
        try {
            const cookies = cookie.parse(socket.handshake.headers.cookie || "");
            const token = cookies.token;
            if (!token) {
                return next(new Error("Authentication error"));
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await userModel.findById(decoded._id).lean();
            if (!user) {
                return next(new Error("User not found"));
            }
            socket.userId = user._id.toString();
            socket.user = user;
            next();
        } catch (err) {
            next(new Error("Authentication error"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.userId;
        onlineUsers.set(userId, socket.id);

        // Notify others this user is online
        socket.broadcast.emit("userOnline", userId);

        // Join a personal room for targeted messages
        socket.join(userId);

        // Send message
        socket.on("sendMessage", async (data, callback) => {
            try {
                const { receiverId, text } = data;
                if (!receiverId || !text || !text.trim()) {
                    return callback?.({ error: "Invalid message data" });
                }

                // Save to database
                const message = await Message.create({
                    senderId: userId,
                    receiverId,
                    text: text.trim(),
                });

                const messageData = {
                    _id: message._id.toString(),
                    senderId: userId,
                    receiverId,
                    text: message.text,
                    createdAt: message.createdAt.toISOString(),
                };

                // Send to receiver if online
                io.to(receiverId).emit("receiveMessage", messageData);

                // Acknowledge to sender
                callback?.({ success: true, message: messageData });
            } catch (err) {
                callback?.({ error: "Failed to send message" });
            }
        });

        // Typing indicator
        socket.on("typing", ({ receiverId }) => {
            io.to(receiverId).emit("userTyping", { senderId: userId });
        });

        socket.on("stopTyping", ({ receiverId }) => {
            io.to(receiverId).emit("userStopTyping", { senderId: userId });
        });

        // Disconnect
        socket.on("disconnect", () => {
            onlineUsers.delete(userId);
            socket.broadcast.emit("userOffline", userId);
        });
    });

    return io;
}

module.exports = { initializeSocket };
