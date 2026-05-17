const jwt = require('jsonwebtoken');
const userModel = require('../models/user')

const userAuth = async (req, res, next) => {
    try {
        const cookies = req.cookies;
        const { token } = cookies;
        if (!token) {
            throw new Error('Invalid Token')
        }
        const decodedId = await jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedId._id
        const user = await userModel.findById(userId);
        if (user.length === 0) {
            throw new Error('no users found')
        }
        req.user = user;
        next();
    }
    catch (err) {
        res.status(400).send('ERROR : ' + err)
    }
};

module.exports = { userAuth };