const { Server } = require("socket.io");
const crypto = require('crypto');
const Message = require("../models/message");

// Track online users: userId -> socketId
const onlineUsers = new Map();

const getSecretRoomId = (userId, targetUserId) => {
    const sorted = [userId, targetUserId].sort().join('_');
    return crypto.createHash('sha256').update(sorted).digest('hex');
}

let ioInstance = null;

const getIO = () => ioInstance;
const getOnlineUsers = () => onlineUsers;

const initializeSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: function (origin, callback) {
                if (!origin) return callback(null, true);
                callback(null, origin);
            },
            credentials: true,
        },
    });

    ioInstance = io;

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.id}`);

        // User registers as online when chat page loads
        socket.on("goOnline", ({ userId }) => {
            socket.userId = userId;
            onlineUsers.set(userId, socket.id);

            // Send current online users list to this user
            socket.emit("onlineUsers", Array.from(onlineUsers.keys()));

            // Notify everyone else this user came online
            socket.broadcast.emit("userOnline", userId);
        });

        // User joins a specific chat room with a match
        socket.on("joinChat", ({ userId, targetUserId }) => {
            const roomId = getSecretRoomId(userId, targetUserId);
            socket.join(roomId);
        });

        socket.on("sendMessage", async ({
            userId,
            targetUserId,
            text,
        }) => {
            try {
                const msg = await Message.create({
                    senderId: userId,
                    receiverId: targetUserId,
                    text,
                });

                const roomId = getSecretRoomId(userId, targetUserId);
                io.to(roomId).emit("receivedMessage", {
                    _id: msg._id,
                    message: text,
                    senderId: userId,
                    createdAt: msg.createdAt,
                });

                // Send notification to receiver if they're online
                const receiverSocketId = onlineUsers.get(targetUserId);
                if (receiverSocketId) {
                    const User = require("../models/user");
                    const sender = await User.findById(userId).select("firstName lastName photoURL").lean();
                    io.to(receiverSocketId).emit("notification", {
                        type: "unread_message",
                        from: sender,
                        lastMessage: text,
                        createdAt: msg.createdAt,
                    });
                }
            } catch (err) {
                console.error("Failed to save message:", err.message);
            }
        });

        socket.on("disconnect", () => {
            if (socket.userId) {
                onlineUsers.delete(socket.userId);
                io.emit("userOffline", socket.userId);
            }
            console.log(`User disconnected: ${socket.id}`);
        });
    });
};

module.exports = { initializeSocket, getIO, getOnlineUsers };
