const express = require("express");
const { userAuth } = require("../middlewares/auth");
const { ConnectionRequest } = require("../models/connectionRequests");
const Message = require("../models/message");

const notificationsRouter = express.Router();

// GET /notifications - Get notifications (received requests + unread message count)
notificationsRouter.get("/notifications", userAuth, async (req, res) => {
    try {
        const userId = req.user._id;

        // Get pending connection requests received
        const pendingRequests = await ConnectionRequest.find({
            toUserId: userId,
            status: "interested",
        })
            .populate("fromUserId", "firstName lastName photoURL jobTitle")
            .sort({ createdAt: -1 })
            .lean();

        const connectionNotifications = pendingRequests.map((req) => ({
            _id: req._id,
            type: "connection_request",
            from: req.fromUserId,
            createdAt: req.createdAt,
        }));

        // Get unread message count grouped by sender
        const unreadMessages = await Message.aggregate([
            { $match: { receiverId: userId, read: false } },
            {
                $group: {
                    _id: "$senderId",
                    count: { $sum: 1 },
                    lastMessage: { $last: "$text" },
                    lastAt: { $last: "$createdAt" },
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "sender",
                    pipeline: [{ $project: { firstName: 1, lastName: 1, photoURL: 1 } }],
                },
            },
            { $unwind: "$sender" },
            { $sort: { lastAt: -1 } },
        ]);

        const messageNotifications = unreadMessages.map((m) => ({
            _id: m._id.toString(),
            type: "unread_message",
            from: m.sender,
            count: m.count,
            lastMessage: m.lastMessage,
            createdAt: m.lastAt,
        }));

        // Count each sender as 1 notification, not each message
        const totalUnread =
            connectionNotifications.length +
            unreadMessages.length;

        res.json({
            notifications: [...connectionNotifications, ...messageNotifications].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ),
            totalUnread,
            unreadConnections: connectionNotifications.length,
            unreadMessages: unreadMessages.length,
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch notifications: " + err.message });
    }
});

// POST /notifications/messages/read/:senderId - Mark messages from a sender as read
notificationsRouter.post("/notifications/messages/read/:senderId", userAuth, async (req, res) => {
    try {
        const userId = req.user._id;
        const senderId = req.params.senderId;

        await Message.updateMany(
            { senderId, receiverId: userId, read: false },
            { $set: { read: true } }
        );

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Failed to mark as read: " + err.message });
    }
});

module.exports = { notificationsRouter };
