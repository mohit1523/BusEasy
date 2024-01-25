  import { createBus } from "./createBus.js";

window.addEventListener("load", () => {
  if (!localStorage.getItem("token")) window.location.replace("index.html");
});

let copyrightDiv = document.getElementById("copyright");
let date = new Date();

copyrightDiv.innerHTML = `&copy; ` + date.getFullYear();

let topBtn = document.getElementById("topBtn");
topBtn.addEventListener("click", () => {
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
});

// CODE FOR THE FROM AND TO LOCATION SELECT OPTION

let fromLocSelect = document.getElementById("from-select");
let toLocSelect = document.getElementById("to-select");
let fromArr = [];
let toArr = [];

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
    data.forEach((element) => {
      if (fromArr.indexOf(element.from) === -1) {
        let fromOption = document.createElement("option");
        fromOption.innerText = element.from;
        fromLocSelect.append(fromOption);
        fromArr.push(element.from);
      }
      if (toArr.indexOf(element.to) === -1) {
        let toOption = document.createElement("option");
        toOption.innerText = element.to;
        toLocSelect.append(toOption);
        toArr.push(element.to);
      }
    });
  })
  .catch((err) => {
    alert("Internal Server Error : " + err.message);
  });

// CODE TO CHECK BUS IN SELECTOR OPTIONS

let findBusBtn = document.getElementById("findBusBtn");
let busToShowSection = document.querySelector(".busToShow");

findBusBtn.addEventListener("click", async () => {
  if (fromLocSelect.value === "none" || toLocSelect.value === "none") {
    alert("Select appropriate locations");
  } else if (fromLocSelect.value === toLocSelect.value) {
    alert("From and To location can not be same");
  } else {
    await fetch("http://localhost:3000/bus/findbuses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromLocSelect.value,
        to: toLocSelect.value,
      }),
    })
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        busToShowSection.innerHTML = "";

        let busToShowHead = document.createElement("h1");
        busToShowHead.classList.add("busToShowHead");
        busToShowHead.innerHTML = "Available Buses on the above route :";
        busToShowSection.append(busToShowHead);
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
  }
});

// CODE FOR LOGOUT TO ACCOUNT
let logoutBtn = document.getElementById("logout");
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  window.location.replace("index.html");
});