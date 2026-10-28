/* LOGIN - CUSTOMER OR SHOP ADMIN (checked against MySQL) */
document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const emailInput = document.getElementById("email");
  const email = emailInput.value.trim().toLowerCase();
  const password = document.getElementById("password").value;
  const message = document.getElementById("message");

  emailInput.value = email;

  if (!email || !password.trim()) {
    message.innerText = "Enter your email address and password.";
    message.className = "message error";
    return;
  }

  if (emailInput.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    message.innerText = "Enter a valid email address.";
    message.className = "message error";
    return;
  }

  fetch("api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.ok) {
        message.innerText = data.message || "Incorrect email or password.";
        message.className = "message error";
        return;
      }

      const user = data.user;

      if (user.role === "admin") {
        localStorage.setItem("currentAdmin", JSON.stringify(user));
        localStorage.removeItem("currentUser");
        message.innerText = "Admin login successful!";
        message.className = "message success";
        setTimeout(() => window.location.href = "admin-dashboard.html", 500);
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify(user));
      localStorage.removeItem("currentAdmin");
      message.innerText = "Login successful!";
      message.className = "message success";
      setTimeout(() => window.location.href = "index.html", 500);
    })
    .catch(() => {
      message.innerText = "Cannot reach the server. Is the SmartClo server running (run.bat) and are you on http://localhost:5000?";
      message.className = "message error";
    });
});

document.querySelector(".password-toggle").addEventListener("click", function() {
  const password = document.getElementById("password");
  const isVisible = password.type === "text";

  password.type = isVisible ? "password" : "text";
  this.textContent = isVisible ? "Show" : "Hide";
  this.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
  this.setAttribute("aria-pressed", String(!isVisible));
});
