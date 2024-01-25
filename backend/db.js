const mongoose = require('mongoose');
const URL = "mongodb://127.0.0.1:27017/busdb";

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
