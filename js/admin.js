let companyName = document.querySelector('h1 > span');
let allOwners = document.getElementById('allOwners');

fetch('https://bus-easy-api.vercel.app/user/getOwners', {
    method: "GET",
    headers: {
        "Content-Type": "application/json",
    }
})
    .then((result) => {
        return result.json()
    })
    .then((data) => {
        if (data.length) {
            let cnt = 1;
            data.forEach((elem) => {
                let ownerDiv = `<tr class="owner"><td>${cnt++}</td><td class="name">${elem.name}</td><td class="email">${elem.email}</td></tr>`;

                allOwners.innerHTML += ownerDiv;
            })
        }
        else {
            allOwners.innerHTML = "<h3>No owners exists.</h3>";
        }
    })

// CODE TO LOGOUT
let logoutBtn = document.getElementById("logout");
logoutBtn.addEventListener("click", () => {
    localStorage.removeItem('token');
    window.location.replace("index.html");
});