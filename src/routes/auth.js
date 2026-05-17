const express = require("express");
const bcrypt = require("bcrypt");
const authRouter = express.Router();
const userModel = require("../models/user");
const { upload } = require("../middlewares/upload");
const { uploadToCloudinary } = require("../config/cloudinary");


authRouter.post("/auth/signup", upload.single('photo'), async (req, res) => {
    try {
        const { firstName, lastName, emailId, password, age, gender, Description, interests, location } = req.body;
        if (!password) {
            return res.status(400).send("Password is required");
        }
        const passwordHash = await bcrypt.hash(password, 10);
        let photoURL;
        if (req.file) {
            photoURL = await uploadToCloudinary(req.file.buffer, "devtinder/avatars");
        }
        const user = new userModel({ firstName, lastName, emailId, password: passwordHash, age, gender, photoURL, Description, interests, location });
        await user.save();
        res.send('User created successfully');
    } catch (err) {
        res.status(400).send("ERROR: " + err.message);
    }
});

authRouter.post("/auth/signin", async (req, res) => {
    try {
        const { emailId, password } = req.body;
        const user = await userModel.findOne({ emailId: emailId })
        if (!user) {
            throw new Error("Invalid Credentials");
        }

        if (!user.password) {
            throw new Error("This account uses Google sign-in. Please use 'Continue with Google'.");
        }
        const isPasswordValid = await user.validatePassword(password);
        if (isPasswordValid) {
            const token = await user.getJWT();
            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: "none",
            });
            res.send('User Logedin Successfully')
        }
        else {
            throw new Error('Invalid Credentials')
        }
    }
    catch (err) {
        res.status(400).send('ERROR:' + err.message)
    }
});

authRouter.post("/auth/google", async (req, res) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) {
            return res.status(400).json({ message: "No access token provided" });
        }

        // Verify the access token by fetching user info from Google server-side
        const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!googleRes.ok) {
            throw new Error("Invalid Google access token");
        }

        const { sub: googleId, email, given_name, family_name, picture } = await googleRes.json();

        if (!email) {
            throw new Error("Google account has no email");
        }

        // Find existing user by googleId or email
        let user = await userModel.findOne({
            $or: [{ googleId }, { emailId: email }],
        });

        if (user) {
            // Link Google account if user exists by email but hasn't linked Google yet
            if (!user.googleId) {
                user.googleId = googleId;
                if (picture && user.photoURL === "https://via.placeholder.com/150") {
                    user.photoURL = picture;
                }
                await user.save();
            }
        } else {
            // Create new user from Google profile
            // Pad short names to meet minlength:3 schema requirement
            const firstName = (given_name || "User").padEnd(3, " ").trim() || "User";
            const lastName = (family_name || "User").padEnd(3, " ").trim() || "User";
            user = new userModel({
                firstName: firstName.length >= 3 ? firstName : "User",
                lastName: lastName.length >= 3 ? lastName : "User",
                emailId: email,
                googleId,
                photoURL: picture || "https://via.placeholder.com/150",
            });
            await user.save();
        }

        const token = await user.getJWT();
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });
        res.json({ success: true, message: "Google sign-in successful" });
    } catch (err) {
        res.status(400).json({ message: "Google sign-in failed: " + err.message });
    }
});

authRouter.post("/auth/logout", async (req, res) => {
    res.cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
        secure: true,
        sameSite: "none",
    });
    res.send("Logout Successful");
})

module.exports = { authRouter };