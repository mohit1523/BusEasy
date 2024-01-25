import { createBus } from './createBus.js'

window.addEventListener("load", () => {
  if (!localStorage.getItem("token")) window.location.replace("index.html");
});

let busToShowSection = document.querySelector('.busToShow');

fetch("http://localhost:3000/bus/allbuses", {
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
})
  .then((response) => {
    return response.json();
  })
  .then((data) => {
    if (data.length) {
      data.forEach((element) => {
        createBus(
          busToShowSection,
          element.name,
          element.from,
          element.to,
          element.numOfSeats,
          element.timeFrom,
          element.timeTo,
          element.busNumber,
          element.seatAllocated
        );
      });
    } else {
      let noBusHead = document.createElement("h3");
      noBusHead.classList.add("noBus");
      noBusHead.innerHTML = "&#128532; No buses available !!!";
      busToShowSection.append(noBusHead);
    }
  })
  .catch((err) => {
    alert("Internal Server Error : " + err.message);
  });
