const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 20
    },
    lastName: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 20
    },
    emailId: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        validator: function (value) {
            const validator = require("validator");

            if (!validator.isEmail(value)) {
                throw new Error("Invalid email format");
            }
        },
        trim: true,
    },
    password: {
        type: String,
        validate: {
            validator: function (value) {
                if (!value) return true; // Allow empty for Google OAuth users
                return validator.isStrongPassword(value, {
                    minLength: 8,
                    minLowercase: 1,
                    minUppercase: 1,
                    minNumbers: 1,
                    minSymbols: 1,
                    maxlength: 100
                });
            },
            message: "Password must be strong (8+ chars, upper, lower, number, symbol)"
        }
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true,
    },
    Description: {
        type: String,
        default: "description will show here",
        maxlength: 100
    },
    interests: {
        type: [String],
        maxlength: 20,
        default: []
    },
    country: {
        type: String,
        maxlength: 60,
        default: '',
    },
    city: {
        type: String,
        maxlength: 60,
        default: '',
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    age: {
        type: Number,
        min: 18,
        max: 100
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        validate: {
            validator: function (v) {
                return ['male', 'female', 'other'].includes(v);
            },
            message: props => `${props.value} is not a valid gender!`
        },
        trim: true,
        default: 'male'
    },
    photoURL: {
        type: String,
        default: 'https://via.placeholder.com/150',
        validate: {
            validator: function (value) {
                return validator.isURL(value) || value.startsWith('/uploads/');
            },
            message: "Invalid photo URL or path"
        }
    },
    gallery: {
        type: [String], // Array of strings to store multiple image URLs
        validate: {
            validator: function (array) {
                return array.length <= 6; // Limit gallery to 6 photos (standard for dating apps)
            },
            message: 'Gallery cannot exceed 6 photos'
        },
        default: []
    },
    languages: {
        type: [String],
        validate: {
            validator: function (v) {
                return v.length <= 10;
            },
            message: "You can't list more than 10 languages."
        },
        default: []
    },
    jobTitle: {
        type: String,
        maxlength: 50,
        trim: true,
        default: "Software Engineer"
    },
    company: {
        type: String,
        maxlength: 50,
        trim: true
    },
    profileComplete: {
        type: Boolean,
        default: false,
    },
    isPremium: {
        type: Boolean,
        default: false,
    },
    premiumPlan: {
        type: String,
        enum: ["monthly", "yearly", null],
        default: null,
    },
    premiumExpiresAt: {
        type: Date,
        default: null,
    },
},
    {
        timestamps: true
    }
);

userSchema.methods.getJWT = async function () {
    const token = await jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return token;
};

userSchema.methods.validatePassword = async function (passwordInput) {
    const isPasswordValid = await bcrypt.compare(passwordInput, this.password);
    return isPasswordValid
}

module.exports = mongoose.model("User", userSchema);