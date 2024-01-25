// CODE FOR ALL USER TICKETS

import { createTicket } from "./createTicket.js";
let ticketToShow = document.querySelector(".tickets");

fetch("http://localhost:3000/ticket/alltickets", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
    "auth-token": localStorage.getItem("token"),
  },
})
  .then((response) => {
    return response.json();
  })
  .then((data) => {
    data.tickets.forEach((element) => {
      createTicket(
        ticketToShow,
        element.ticketNumber,
        element.nameOfUsers,
        element.seats,
        element.busNumber,
        element._id
      );
    });
  })
  .catch((err) => {
    alert(`Internal Server Error : ${err.message}`);
  });