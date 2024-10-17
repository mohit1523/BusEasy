window.addEventListener("load", () => {
  if (localStorage.getItem("token")) window.location.replace("passenger-home.html");
});

let emailOfUser = document.getElementById("email");
let passwordOfUser = document.getElementById("password");

let loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await fetch("https://bus-easy-api.vercel.app/user/loginuser", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: emailOfUser.value,
      password: passwordOfUser.value,
    }),
  })
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      alert(data.msg);
      localStorage.setItem("token", data.token);

      if (data.msg === "User Logged in") {
        location.replace("passenger-home.html");
      }
      else if (data.msg === 'Admin Logged in') {
        location.replace('admin.html');
      }
      else if(data.msg === 'Bus Owner Logged in'){
        location.replace('bus-owner.html');
      }

    })
    .catch((error) => {
      alert("Internal Server Error : " + error.message);
    });
});
