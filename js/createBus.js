import { showAndSelectSeatModal } from './createSeatSelectionModal.js';

export function createBus(
  container,
  name,
  fromLoc,
  toLoc,
  numOfSeats,
  fromTime,
  toTime,
  number,
  seatAllocatedArr
) {
  let bus = document.createElement("div");
  let nameDiv = document.createElement("div");
  let fromAndToLocDiv = document.createElement("div");
  let numOfSeatsDiv = document.createElement("div");
  let fromAndToTimeDiv = document.createElement("div");
  let numberDiv = document.createElement("div");
  let bookTicketBtn = document.createElement("button");

  bus.classList.add("bus");
  nameDiv.classList.add("bus-name");
  fromAndToLocDiv.classList.add("start-end-pos");
  numOfSeatsDiv.classList.add("seat");
  fromAndToTimeDiv.classList.add("timing");
  numberDiv.classList.add("number-plate");
  bookTicketBtn.classList.add("book-ticket");

  // CODE FOR BOOKING A TICKET FOR THIS BUS
  bookTicketBtn.addEventListener("click", async () => {
    let seatModalSection = document.querySelector('.modalForSeatSelection');
    showAndSelectSeatModal(seatModalSection, number, numOfSeats, seatAllocatedArr);
  });

  nameDiv.innerHTML = `<i class="fa-solid fa-bus"></i><span> ${name}</span>`;
  fromAndToLocDiv.innerHTML = `<i class="fa-solid fa-flag-checkered"></i><span> ${fromLoc}</span> <i class="fa-solid fa-right-long"></i><span> ${toLoc}</span>`;
  numOfSeatsDiv.innerHTML = `<i class="fa-solid fa-chair"></i><span> No. of seats :- ${numOfSeats}</span>`;
  fromAndToTimeDiv.innerHTML = `<i class="fa-regular fa-clock"></i><span> Timing :- ${fromTime} to ${toTime}</span>`;
  numberDiv.innerHTML = `<span>&#9679;</span><span>${number}</span><span>&#9679;</span>`;
  bookTicketBtn.innerHTML = `Book Ticket`;

  bus.append(
    nameDiv,
    fromAndToLocDiv,
    numOfSeatsDiv,
    fromAndToTimeDiv,
    bookTicketBtn,
    numberDiv
  );
  container.append(bus);
}
