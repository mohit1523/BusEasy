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
            data.forEach((elem) => {
                allOwners.append(elem);
            })
        }
        else {
            allOwners.innerHTML = "<h3>No owners exists.</h3>";
        }
    })