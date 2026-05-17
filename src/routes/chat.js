const express = require("express");
const { userAuth } = require("../middlewares/auth");
const Message = require("../models/message");

const chatRouter = express.Router();

// GET /chat/:userId - Get message history with a specific user
chatRouter.get("/chat/:userId", userAuth, async (req, res) => {
    try {
        const myId = req.user._id;
        const otherId = req.params.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: otherId },
                { senderId: otherId, receiverId: myId },
            ],
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Return in chronological order
        res.json(messages.reverse());
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch messages: " + err.message });
    }
});

module.exports = { chatRouter };
