const express = require("express");
const { userAuth } = require("../middlewares/auth");

const premiumRouter = express.Router();

const PLANS = {
    monthly: { amount: 500, label: "Monthly Premium", days: 30 },
    yearly: { amount: 4000, label: "Yearly Premium", days: 365 },
};

// GET /premium/status - Check current user's premium status
premiumRouter.get("/premium/status", userAuth, async (req, res) => {
    try {
        const user = req.user;
        if (user.isPremium && user.premiumExpiresAt && new Date() > user.premiumExpiresAt) {
            user.isPremium = false;
            user.premiumPlan = null;
            user.premiumExpiresAt = null;
            await user.save();
        }
        res.json({
            isPremium: user.isPremium,
            premiumPlan: user.premiumPlan,
            premiumExpiresAt: user.premiumExpiresAt,
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch premium status" });
    }
});

// POST /premium/activate-test - FOR TESTING: manually activate premium
premiumRouter.post("/premium/activate-test", userAuth, async (req, res) => {
    try {
        const { plan } = req.body;
        const planInfo = PLANS[plan || "monthly"];
        const user = req.user;
        const now = new Date();

        user.isPremium = true;
        user.premiumPlan = plan || "monthly";
        user.premiumExpiresAt = new Date(now.getTime() + planInfo.days * 24 * 60 * 60 * 1000);
        await user.save();

        res.json({
            success: true,
            message: "Premium activated (test mode)",
            isPremium: true,
            premiumPlan: user.premiumPlan,
            premiumExpiresAt: user.premiumExpiresAt,
        });
    } catch (err) {
        res.status(500).json({ message: "Test activation failed: " + err.message });
    }
});

// POST /premium/cancel - Cancel premium subscription
premiumRouter.post("/premium/cancel", userAuth, async (req, res) => {
    try {
        const user = req.user;
        if (!user.isPremium) {
            return res.status(400).json({ message: "You don't have an active premium subscription" });
        }

        user.isPremium = false;
        user.premiumPlan = null;
        user.premiumExpiresAt = null;
        await user.save();

        res.json({
            success: true,
            message: "Premium subscription cancelled successfully",
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to cancel subscription: " + err.message });
    }
});

module.exports = { premiumRouter };
