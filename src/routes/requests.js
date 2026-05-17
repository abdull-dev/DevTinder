const express = require("express");
const { userAuth } = require("../middlewares/auth");
const { ConnectionRequest } = require("../models/connectionRequests");
const requestsRouter = express.Router();

requestsRouter.post("/request/send/:status/:toUserId", userAuth, async (req, res) => {
    try {
        const fromUserId = req.user._id;
        const toUserId = req.params.toUserId;
        const status = req.params.status;

        const allowedStatuses = ["interested", "ignored"];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: `Invalid status type: ${status}`
            });
        }

        if (fromUserId.toString() === toUserId) {
            return res.status(400).json({
                message: "You cannot send a connection request to yourself!"
            });
        }

        const existingRequest = await ConnectionRequest.findOne({
            $or: [
                { fromUserId, toUserId },
                { fromUserId: toUserId, toUserId: fromUserId }
            ]
        });

        if (existingRequest) {
            return res.status(400).json({
                message: "Connection request already exists or is pending."
            });
        }

        const connectionRequest = new ConnectionRequest({
            fromUserId,
            toUserId,
            status,
        });

        const data = await connectionRequest.save();

        res.json({
            message: "Connection request sent successfully!",
            data,
        });

    } catch (err) {
        res.status(400).send("ERROR: " + err.message);
    }
});

requestsRouter.post("/request/review/:status/:requestId", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { status, requestId } = req.params;

        const allowedStatuses = ["accepted", "rejected"];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: `Invalid status type: ${status}. Allowed: accepted, rejected`
            });
        }

        console.log('reqId', requestId, loggedInUser._id)

        const connectionRequest = await ConnectionRequest.findOne({
            _id: requestId,
            toUserId: loggedInUser._id,
            status: "interested"
        });

        if (!connectionRequest) {
            return res.status(404).json({
                message: "Connection request not found or cannot be reviewed."
            });
        }

        connectionRequest.status = status;
        const data = await connectionRequest.save();

        res.json({
            message: `Connection request ${status} successfully!`,
            data
        });

    } catch (err) {
        res.status(400).send("ERROR: " + err.message);
    }
});

module.exports = { requestsRouter }