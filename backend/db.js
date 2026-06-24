const mongoose = require("mongoose");

const DB_URL =
  process.env.MONGO_URL ||
  "mongodb://127.0.0.1:27017/buseasy";

const DBConnect = async () => {
  try {
    await mongoose.connect(DB_URL);
    console.log("Database connected");
  } catch (error) {
    console.log(error);
  }
};

module.exports = DBConnect;
