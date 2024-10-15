window.addEventListener("load", () => {
  if (localStorage.getItem("token")) window.location.replace("passenger-home.html");
});

let signUpForm = document.forms["signupForm"];

signUpForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  let nameOfUser = signUpForm.elements["name"];
  let emailOfUser = signUpForm.elements["email"];
  let passwordOfUser = signUpForm.elements["password"];
  let confirmPasswordOfUser = signUpForm.elements["confirm-password"];
  let role = signUpForm.elements["role-option"];

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
        role: role.value
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
        else if (data.msg === 'Admin Created') {
          location.replace('admin.html');
        }
        else if(data.msg === 'Bus Owner Created'){
          location.replace('bus-owner.html');
        }
      })
      .catch((error) => {
        alert("Internal Server Error : " + error.message);
      });
  } else {
    alert("Enter correct password");
  }
});
