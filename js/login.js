window.addEventListener("load", () => {
  if (localStorage.getItem("token")) window.location.replace("passenger-home.html");
});

let emailOfUser = document.getElementById("email");
let passwordOfUser = document.getElementById("password");

let loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await fetch("http://localhost:3000/user/loginuser", {
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
      if(data.msg === "Admin Logged in"){
        window.location.replace("admin.html");
      }
      else if (data.msg === "Logged in") {
        localStorage.setItem("token", data.token);
        window.location.replace("passenger-home.html");
      }
    })
    .catch((error) => {
      alert("Internal Server Error : " + error.message);
    });
});
