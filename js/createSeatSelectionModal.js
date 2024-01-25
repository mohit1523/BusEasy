export function showAndSelectSeatModal(container, busNumber, totalSeats, seatArray) {
    let dialogIdDiv = document.createElement('div');
    let h1Dialog = document.createElement('h1');
    let form = document.createElement('form');
    let section1 = document.createElement('section');
    let section2 = document.createElement('section');
    let mainDivOfSection1 = document.createElement('div');
    let twoSeatDiv = document.createElement('div');
    let threeSeatDiv = document.createElement('div');
    let h3Section1 = document.createElement('h3');
    let btnRightSection1 = document.createElement('button');
    let btnSubmitSection2 = document.createElement('button');
    let btnLeftSection2 = document.createElement('button');
    let busImage = document.createElement('img');
    let closeModalBtn = document.createElement('button');

    dialogIdDiv.id = 'dialog';
    twoSeatDiv.classList.add('two-seat-row');
    threeSeatDiv.classList.add('three-seat-row');
    btnRightSection1.classList.add('section-nav-btn');
    btnRightSection1.classList.add('right-section-btn');
    btnLeftSection2.classList.add('section-nav-btn');
    btnLeftSection2.classList.add('left-section-btn');
    closeModalBtn.classList.add('closeModalBtn');

    for (let i = 1; i <= totalSeats; i++) {
        let seatCheckBox = document.createElement('input');
        seatCheckBox.type = 'checkbox';
        seatCheckBox.name = `${i}`;

        if (seatArray.indexOf(i) != -1) {
            seatCheckBox.disabled = true;
            seatCheckBox.title = "Not Available";
        }

        if (i % 5 === 1 || i % 5 === 2) {
            twoSeatDiv.append(seatCheckBox);
        }
        else if (i % 5 === 3 || i % 5 === 4 || i % 5 === 0) {
            threeSeatDiv.append(seatCheckBox);
        }
    }

    h1Dialog.innerHTML = "Select Seats :";
    h3Section1.innerHTML = "No. of selected Tickets : <span class='no-of-select-seat'>0</span>";
    btnRightSection1.type = 'button';
    btnRightSection1.innerHTML = '<i class="fa-solid fa-angle-right"></i>';
    btnSubmitSection2.type = "submit";
    btnSubmitSection2.innerHTML = "Confirm Ticket";
    btnLeftSection2.type = 'button';
    btnLeftSection2.innerHTML = '<i class="fa-solid fa-angle-left"></i>';
    busImage.src = 'assets/bus-side-view-icon.svg';
    closeModalBtn.innerHTML = '<i class="fa-regular fa-circle-xmark"></i>';

    mainDivOfSection1.append(twoSeatDiv, threeSeatDiv);
    section1.append(mainDivOfSection1, h3Section1, btnRightSection1);
    section2.append(btnSubmitSection2, btnLeftSection2);
    form.append(section1, section2);
    dialogIdDiv.append(h1Dialog, form);
    container.append(dialogIdDiv, busImage, closeModalBtn);

    container.style.display = 'flex';

    closeModalBtn.addEventListener('click', () => {
        dialogIdDiv.remove();
        busImage.remove();
        closeModalBtn.remove();
        container.style.display = 'none';
    })
    
    let selectedSeats = 0;
    const noOfSelectSeat = document.querySelector('.no-of-select-seat');
    let busSelectSeats = document.querySelectorAll('#dialog input[type="checkbox"]');

    busSelectSeats.forEach((elem) => {
        elem.addEventListener('change', () => {
            if (elem.checked)
                noOfSelectSeat.innerText = ++selectedSeats;
            else
                noOfSelectSeat.innerText = --selectedSeats;
        })
    })


    btnRightSection1.addEventListener('click', () => {
        form.style.transform = "translate(-35vw)";
        for (let i = selectedSeats; i >= 1; i--) {
            let temp = document.createElement('input');
            temp.type = 'text';
            temp.required = true;
            temp.placeholder = `Enter the name of person ${i}`;
            section2.prepend(temp);
        }
    })
    btnLeftSection2.addEventListener('click', () => {
        form.style.transform = "translate(0)";
        let tempInputTags = section2.querySelectorAll('input[type="text"]');
        tempInputTags.forEach((elem) => {
            section2.removeChild(elem);
        })
    })

    form.addEventListener('submit', async (e) => {
        let seatArrOfBus = [];
        let usersArr = [];
        e.preventDefault();
        let allSeatsInput = document.querySelectorAll('.two-seat-row input, .three-seat-row input');
        allSeatsInput.forEach((elem) => {
            if (elem.checked === true) seatArrOfBus.push(elem.name - '0');
        })

        if (seatArrOfBus.length === 0) {
            alert('Please select seats');
            return;
        }

        let allNameInputs = section2.querySelectorAll('input[type="text"]');
        allNameInputs.forEach((elem) => {
            usersArr.push(elem.value);
        })

        let passwordOfCurrUser = prompt('Enter Your Password');

        if (passwordOfCurrUser === null) { }
        else if (passwordOfCurrUser.trim() === "") alert('Enter your password')
        else {
            fetch("http://localhost:3000/ticket/bookticket", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "auth-token": localStorage.getItem("token"),
                },
                body: JSON.stringify({
                    nameOfUsers: usersArr,
                    seats: seatArrOfBus,
                    busNumber: busNumber,
                    userPassword: passwordOfCurrUser,
                }),
            })
                .then((response) => {
                    return response.json();
                })
                .then((data) => {
                    alert(data.msg);
                    if(data.msg === 'Ticket Booked Successfully!!'){
                        window.location.reload();
                    }
                })
                .catch((err) => {
                    alert(`Internal Server Error : ${err.message}`);
                });
        }
    })
}