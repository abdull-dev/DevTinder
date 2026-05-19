const validator = require("validator");

const isProfileUpdateAllowed = (req) => {
    const allowedUpdates = new Set([
        "firstName", "lastName", "age", "gender", "photoURL",
        "Description", "interests", "country", "city", "jobTitle",
        "languages", "company", "gallery", "profileComplete"
    ]);
    const isUpdateAllowed = Object.keys(req.body).every((field) =>
        allowedUpdates.has(field)
    );

    return isUpdateAllowed;
};

const isValidEmail = (email) => {
    if (!email) return false;

    const cleanEmail = email.trim();

    return validator.isEmail(cleanEmail);
};

module.exports = { isProfileUpdateAllowed, isValidEmail };