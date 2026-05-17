const express = require("express");
const bcrypt = require("bcrypt");
const { userAuth } = require("../middlewares/auth");
const { isValidEmail } = require("../utils/validation");
const userModel = require("../models/user");
const settingsRouter = express.Router();

settingsRouter.patch("/settings/password/update", userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            throw new Error("Both old and new passwords are required.");
        }

        const isOldPasswordCorrect = await loggedInUser.validatePassword(oldPassword);
        if (!isOldPasswordCorrect) {
            throw new Error("Invalid current password.");
        }

        const isSamePassword = await loggedInUser.validatePassword(newPassword);
        if (isSamePassword) {
            throw new Error("New password cannot be the same as the old password.");
        }

        const salt = await bcrypt.genSalt(10);
        loggedInUser.password = await bcrypt.hash(newPassword, salt);

        await loggedInUser.save();

        res.status(200).send("Password updated successfully!");
    }
    catch (err) {
        res.status(400).send("Error: " + err.message);
    }
});

settingsRouter.patch("/settings/email/update", userAuth, async (req, res) => {
    try {
        const { currentEmail, newEmail } = req.body;
        const loggedInUser = req.user;

        if (!currentEmail || !newEmail) {
            return res.status(400).send("Error: Both current and new email are required.");
        }

        if (!isValidEmail(currentEmail) || !isValidEmail(newEmail)) {
            return res.status(400).send("Error: Invalid email format provided.");
        }

        if (loggedInUser.emailId !== currentEmail.trim()) {
            return res.status(400).send("Error: The current email provided does not match our records.");
        }

        if (currentEmail.trim() === newEmail.trim()) {
            return res.status(400).send("Error: New email must be different from your current email.");
        }

        const isEmailTaken = await userModel.findOne({ email: newEmail.trim() });
        if (isEmailTaken) {
            return res.status(400).send("Error: This email is already in use by another account.");
        }

        loggedInUser.emailId = newEmail.trim();
        await loggedInUser.save();

        res.status(200).send("Email updated successfully!");
    }
    catch (err) {
        res.status(500).send("Internal Server Error: " + err.message);
    }
});

module.exports = { settingsRouter };