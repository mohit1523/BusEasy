const mongoose = require('mongoose');
const URL = "mongodb+srv://mohit1502:pCAWZsiL567D97Et@mak.4zerk6q.mongodb.net/busdb?retryWrites=true&w=majority&appName=Mak";

const DBConnect = async () => {
    try {
        await mongoose.connect(URL).then(() => {
            console.log('Database connected');
        })
        
    } catch (error) {
        console.log(error);
    }
}

module.exports = DBConnect;
