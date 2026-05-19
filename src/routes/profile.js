const express = require("express");
const profileRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const { upload } = require("../middlewares/upload");
const { isProfileUpdateAllowed } = require("../utils/validation");
const { uploadToCloudinary } = require("../config/cloudinary");

profileRouter.get('/profile/view', userAuth, async (req, res) => {
    try {
        const user = req.user;
        res.send(user)
    }
    catch (err) {
        res.status(400).send('ERROR: ' + err)
    }
});

profileRouter.patch('/profile/edit', userAuth, async (req, res) => {
    try {
        if (!isProfileUpdateAllowed(req)) {
            throw new Error("Invalid Update Fields");
        }

        const loggedInUser = req.user;

        Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));

        await loggedInUser.save();

        res.json({
            success: true,
            message: `${loggedInUser.firstName}, your profile was updated successfully!`,
            profile: loggedInUser
        });
    }
    catch (err) {
        res.status(400).send("Error :" + err);
    }
});

// Upload profile photo (avatar)
profileRouter.post('/profile/photo', userAuth, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }

        const photoURL = await uploadToCloudinary(req.file.buffer, "devtinder/avatars");
        const loggedInUser = req.user;
        loggedInUser.photoURL = photoURL;
        await loggedInUser.save();

        res.json({
            success: true,
            message: "Profile photo updated!",
            photoURL: loggedInUser.photoURL,
        });
    } catch (err) {
        res.status(400).json({ success: false, message: "Error: " + err.message });
    }
});

// Upload gallery photo(s)
profileRouter.post('/profile/gallery', userAuth, upload.array('photos', 6), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No image files provided" });
        }

        const uploadPromises = req.files.map((f) => uploadToCloudinary(f.buffer, "devtinder/gallery"));
        const newPhotos = await Promise.all(uploadPromises);
        const loggedInUser = req.user;
        const combined = [...loggedInUser.gallery, ...newPhotos];

        if (combined.length > 6) {
            return res.status(400).json({
                success: false,
                message: `Gallery cannot exceed 6 photos. You have ${loggedInUser.gallery.length}, tried to add ${newPhotos.length}.`,
            });
        }

        loggedInUser.gallery = combined;
        await loggedInUser.save();

        res.json({
            success: true,
            message: `${newPhotos.length} photo(s) added to gallery!`,
            gallery: loggedInUser.gallery,
        });
    } catch (err) {
        res.status(400).json({ success: false, message: "Error: " + err.message });
    }
});

module.exports = { profileRouter }
