export async function createTicket(
  container,
  ticketNumber,
  nameOfUsers,
  seats,
  busNumber,
  id
) {
  let ticket = document.createElement("div");
  let h1 = document.createElement('h1');
  let div = document.createElement('div');
  let table = document.createElement('table');
  let barcodeDiv = document.createElement('div');
  let busNumberDiv = document.createElement('div');
  let cancelBtn = document.createElement('button');
  let printBtn = document.createElement('button');

  ticket.classList.add('ticket');
  h1.classList.add('bus-name');
  busNumberDiv.classList.add('bus-number');
  barcodeDiv.classList.add('barcode');
  cancelBtn.classList.add('cancelBtn');
  printBtn.id = 'printTicketBtn';

  printBtn.title = "Print Ticket";
  cancelBtn.title = "Cancel Ticket";

  let tableRow = document.createElement('tr');
  tableRow.classList.add('table-head');
  tableRow.innerHTML = '<td>Name</td><td>Seat Number</td>';
  cancelBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
  printBtn.innerHTML = '<i class="fa-solid fa-print"></i>';

  table.append(tableRow);

  cancelBtn.addEventListener('click', async () => {
    let passwordOfUser = prompt('Enter your password');
    if (passwordOfUser === null) { }
    else if (passwordOfUser.trim() === "") alert('Enter your password');
    else {
      await fetch('https://bus-easy-api.vercel.app/ticket/deleteticket', {
        method: 'DELETE',
        headers: {
          "Content-Type": "application/json",
          "auth-token": localStorage.getItem('token')
        },
        body: JSON.stringify({
          ticketId: id,
          userPassword: passwordOfUser,
          busNumber: busNumber,
          seats: seats
        })
      })
        .then((response) => { return response.json() })
        .then((data) => {
          alert(data.msg);
          if (data.msg === "Ticket Cancel Successfully") {
            ticket.remove();
          }
        })
    }
  })

  for (let i = 0; i < nameOfUsers.length; i++) {
    let tableRow = document.createElement('tr');
    tableRow.innerHTML = `<td>${nameOfUsers[i]}</td><td>${seats[i]}</td>`;
    table.append(tableRow);
  }

  tableRow = document.createElement('tr');
  tableRow.classList.add('table-head');
  tableRow.innerHTML = '<td>From :</td><td>To :</td>';
  table.append(tableRow);

  await fetch('https://bus-easy-api.vercel.app/bus/findbus', {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      busNumber: busNumber
    })
  })
    .then((response) => { return response.json() })
    .then((data) => {
      h1.innerHTML = data.name;

      let tr1 = document.createElement('tr');
      tr1.innerHTML = `<td>${data.from}</td><td>${data.to}</td>`

      let tr2 = document.createElement('tr');
      tr2.classList.add('table-head');
      tr2.innerHTML = `<td>Depart Time :</td><td>Destination Time :</td>`

      let tr3 = document.createElement('tr');
      tr3.innerHTML = `<td>${data.timeFrom}</td><td>${data.timeTo}</td>`

      table.append(tr1, tr2, tr3);

    })

  barcodeDiv.innerHTML = ticketNumber;
  busNumberDiv.innerHTML = busNumber;

  printBtn.addEventListener('click', () => {
    let mywindow = window.open("", "PRINT",
      "height=400,width=600");
    mywindow.document.write(ticket.innerHTML);
    
    mywindow.document.close();
    mywindow.focus();

    mywindow.print();
    mywindow.close();

    return true;
  })

  div.style.position = 'relative';

  div.append(table, barcodeDiv, printBtn);
  ticket.append(h1, div, busNumberDiv, cancelBtn);
  container.append(ticket);
}
