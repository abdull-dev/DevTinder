const mongoose = require("mongoose");

const connectionRequestSchema = mongoose.Schema({
    fromUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    toUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    status: {
        type: String,
        enum: {
            values: ["interested", "ignored", "accepted", "rejected"],
            message: '{VALUE} is not a valid status'
        }
    }
},
    {
        timestamps: true
    }
);

connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

const ConnectionRequest = new mongoose.model("connectionRequests", connectionRequestSchema);
module.exports = { ConnectionRequest };