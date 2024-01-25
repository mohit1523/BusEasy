const express = require("express");
const app = express();
const PORT = 3000;
const cors = require("cors");
const DBconnect = require("./db.js");
const busRoute = require("./routes/bus.js");
const userRoute = require("./routes/user.js");
const ticketRoute = require("./routes/ticket.js");

DBconnect();

app.use(cors());
app.use(express.json())

app.use('/bus' , busRoute);
app.use('/user' , userRoute);
app.use('/ticket' , ticketRoute);

app.listen(PORT, () => {
  console.log(`App listening at port ${PORT}`);
});