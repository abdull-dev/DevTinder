const express = require("express");
const userRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const { ConnectionRequest } = require("../models/connectionRequests");
const User = require("../models/user");
const { getIO, getOnlineUsers } = require("../utils/sockets");

userRouter.get("/user/connections/recieved", userAuth, async (req, res) => {
    try {
        const loggedinUserId = req.user;
        const users = await ConnectionRequest.find({ toUserId: loggedinUserId, status: "interested" }).populate("fromUserId", "firstName lastName Description photoURL age gender interests country city jobTitle company languages");;

        return res.json({ success: true, message: "Recieved connections", users });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

userRouter.get("/user/connections/sent", userAuth, async (req, res) => {
    try {
        const loggedinUserId = req.user;
        const users = await ConnectionRequest.find({ fromUserId: loggedinUserId, status: "interested" }).populate("toUserId", "firstName lastName Description photoURL age gender interests country city jobTitle company languages");

        return res.json({ success: true, message: "Sent connections", users });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

userRouter.get("/user/connections/matches", userAuth, async (req, res) => {
    try {
        const loggedinUserId = req.user;
        const populateFields = "firstName lastName photoURL age gender Description interests country city jobTitle company languages isPremium";
        const connections = await ConnectionRequest.find({
            $or: [{ toUserId: loggedinUserId }, { fromUserId: loggedinUserId }],
            status: "accepted",
        })
            .populate("fromUserId", populateFields)
            .populate("toUserId", populateFields);

        // Return the *other* user from each connection (not yourself)
        const loggedInId = loggedinUserId._id?.toString() || loggedinUserId.toString();
        const users = connections
            .filter((conn) => conn.fromUserId && conn.toUserId)
            .map((conn) => {
                const from = conn.fromUserId;
                const to = conn.toUserId;
                return from._id.toString() === loggedInId ? to : from;
            });

        return res.json({ success: true, message: "Matched connections", users });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

userRouter.delete("/request/cancel/:requestId", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { requestId } = req.params;

        const connectionRequest = await ConnectionRequest.findOneAndDelete({
            _id: requestId,
            fromUserId: loggedInUser._id,
            status: "interested"
        });

        if (!connectionRequest) {
            return res.status(404).json({
                message: "Connection request not found, or it has already been accepted/rejected."
            });
        }

        res.json({
            message: "Connection request canceled successfully!",
            data: connectionRequest
        });

    } catch (err) {
        res.status(400).send("ERROR: " + err.message);
    }
});

// DELETE /connection/:userId - Unmatch/delete connection with a user
userRouter.delete("/connection/:userId", userAuth, async (req, res) => {
    try {
        const loggedInId = req.user._id;
        const otherUserId = req.params.userId;
        const Message = require("../models/message");

        const connection = await ConnectionRequest.findOneAndDelete({
            $or: [
                { fromUserId: loggedInId, toUserId: otherUserId },
                { fromUserId: otherUserId, toUserId: loggedInId },
            ],
        });

        if (!connection) {
            return res.status(404).json({ message: "No connection found with this user" });
        }

        // Delete all messages between the two users
        await Message.deleteMany({
            $or: [
                { senderId: loggedInId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: loggedInId },
            ],
        });

        // Notify the other user in real-time
        const io = getIO();
        const onlineUsers = getOnlineUsers();
        const otherSocketId = onlineUsers.get(otherUserId);
        if (io && otherSocketId) {
            io.to(otherSocketId).emit("unmatched", {
                userId: loggedInId.toString(),
            });
        }

        res.json({ message: "Connection removed successfully" });
    } catch (err) {
        res.status(500).json({ message: "Failed to remove connection: " + err.message });
    }
});

// GET /user/search - Search users by name, interests, location, jobTitle
userRouter.get("/user/search", userAuth, async (req, res) => {
    try {
        const q = req.query.q;
        if (!q || q.trim().length === 0) {
            return res.json({ users: [] });
        }

        const regex = new RegExp(q.trim(), "i");
        const loggedInId = req.user._id;

        const users = await User.find({
            _id: { $ne: loggedInId },
            $or: [
                { firstName: regex },
                { lastName: regex },
                { jobTitle: regex },
                { country: regex },
                { city: regex },
                { interests: regex },
                { Description: regex },
            ],
        })
            .select("firstName lastName photoURL age gender Description interests country city jobTitle isPremium")
            .limit(20)
            .lean();

        res.json({ users });
    } catch (err) {
        res.status(500).json({ message: "Search failed: " + err.message });
    }
});

// GET /user/:userId - View someone's profile
userRouter.get("/user/:userId", userAuth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .select("firstName lastName photoURL age gender Description interests country city jobTitle company languages gallery isPremium createdAt");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check connection status between logged-in user and this user
        const loggedInId = req.user._id;
        const connection = await ConnectionRequest.findOne({
            $or: [
                { fromUserId: loggedInId, toUserId: user._id },
                { fromUserId: user._id, toUserId: loggedInId },
            ],
        });

        res.json({
            user,
            connectionStatus: connection ? connection.status : "none",
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch user: " + err.message });
    }
});

userRouter.get("/feed", userAuth, async (req, res) => {
    try {
        let page = Number.parseInt(req.query.page) || 1;
        let limit = Number.parseInt(req.query.limit) || 10;

        const maxLimit = 50;
        if (limit > maxLimit) {
            limit = maxLimit;
        }

        const skip = (page - 1) * limit;
        const loggedinUserId = req.user._id || req.user;
        const connectionRequests = await ConnectionRequest.find({
            $or: [
                { fromUserId: loggedinUserId },
                { toUserId: loggedinUserId }
            ]
        }).select("fromUserId toUserId");

        const hiddenUsers = new Set([loggedinUserId.toString()]);

        connectionRequests.forEach((request) => {
            if (request.fromUserId) hiddenUsers.add(request.fromUserId.toString());
            if (request.toUserId) hiddenUsers.add(request.toUserId.toString());
        });
        const feedUsers = await User.find({
            _id: { $nin: Array.from(hiddenUsers) }
        }).select("firstName lastName photoURL age gender Description interests country city jobTitle company languages").skip(skip).limit(limit);

        return res.json({
            success: true,
            message: "Feed fetched successfully",
            users: feedUsers
        });

    } catch (error) {
        console.error("Feed Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

module.exports = { userRouter };