import { createBus } from "./createBus.js";

let addBtn = document.querySelector(".addBus");
let addBusForm = document.querySelector(".toogle-box form");
let cancelBtn = document.querySelector(".cancel");
let mainToogleBox = document.querySelector(".main-toogle-box");
let innerToogleBox = document.querySelector(".toogle-box");

let busToShowSection = document.querySelector(".buses");

let toogleBoxCloseFunc = () => {
  mainToogleBox.style.height = 0;
  mainToogleBox.style.width = 0;
  mainToogleBox.style.top = "50%";
  mainToogleBox.style.left = "50%";
  innerToogleBox.style.border = "none";
};
let toogleBoxOpenFunc = () => {
  mainToogleBox.style.height = "100%";
  mainToogleBox.style.width = "100%";
  mainToogleBox.style.top = 0;
  mainToogleBox.style.left = 0;
  innerToogleBox.style.border = "2px solid purple";
};

addBtn.addEventListener("click", () => {
  toogleBoxOpenFunc();
});

cancelBtn.addEventListener("click", () => {
  toogleBoxCloseFunc();
});

// CODE TO ADD A NEW BUS

addBusForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  let busNum = document.getElementById("bus-number");
  let busName = document.getElementById("bus-name");
  let fromLoc = document.getElementById("from-loc");
  let toLoc = document.getElementById("to-loc");
  let seatNum = document.getElementById("seat-num");
  let fromTime = document.getElementById("from-time");
  let toTime = document.getElementById("to-time");
  await fetch("http://localhost:3000/bus/createbus", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      busNumber: busNum.value,
      name: busName.value,
      from: fromLoc.value,
      to: toLoc.value,
      numOfSeats: seatNum.value - seatNum.value % 5,
      timeTo: getTimeWithAMPM(toTime),
      timeFrom: getTimeWithAMPM(fromTime),
    }),
  })
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      alert(data.msg);
      if (data.msg === "Bus Created") {
        location.reload();
      }
      busNum.value = "";
      busName.value = "";
      fromLoc.value = "";
      toLoc.value = "";
      seatNum.value = "";
      toTime.value = "";
      fromTime.value = "";
      toogleBoxCloseFunc();
    })
    .catch((error) => {
      alert("Internal Server Error : " + error.message);
    });
});

let getTimeWithAMPM = (time) => {
  let [h, m] = time.value.split(":");
  return `${h % 12 ? h % 12 : 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
};

// CODE TO LOGOUT
let logoutBtn = document.getElementById("logout");
logoutBtn.addEventListener("click", () => {
  window.location.replace("index.html");
});

// CODE TO SHOW ALL BUSES

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
    displayNoneBookBtns();
  })
  .catch((err) => {
    alert("Internal Server Error : " + err.message);
  });

let displayNoneBookBtns = () => {
  let bookTicketBtns = document.querySelectorAll(".book-ticket");
  bookTicketBtns.forEach((btns) => {
    btns.style.display = "none";
  });
};
