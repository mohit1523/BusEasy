window.addEventListener("load", () => {
  if (localStorage.getItem("token")) window.location.replace("passenger-home.html");
});

let nameOfUser = document.getElementById("name");
let emailOfUser = document.getElementById("email");
let passwordOfUser = document.getElementById("password");
let confirmPasswordOfUser = document.getElementById("confirm-password");

let signUpForm = document.getElementById("signupForm");

signUpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (passwordOfUser.value === confirmPasswordOfUser.value) {
    await fetch("https://bus-easy-api.vercel.app/user/createuser", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: nameOfUser.value,
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
        if (data.msg === "User Created") {
          location.replace("passenger-home.html");
        }
        else if (data.msg === 'Admin Created'){
          location.replace('admin.html');
        }
      })
      .catch((error) => {
        alert("Internal Server Error : " + error.message);
      });
  } else {
    alert("Enter correct password");
  }
});
