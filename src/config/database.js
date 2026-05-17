const mongoose = require('mongoose');

const connectDB = async () => {
    await mongoose.connect("mongodb+srv://abdulldev123:devtinder123@devtinder.hdss9zu.mongodb.net/devTinder")
    console.log('Database connected successfully');
}

module.exports = connectDB;