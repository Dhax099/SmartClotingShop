/* CUSTOMER REGISTRATION */
document.getElementById("registerForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value;
  const message = document.getElementById("message");

  document.getElementById("email").value = email;

  if (!name || !email || !phone || !password.trim()) {
    message.innerText = "Complete all fields. Fields cannot contain only spaces.";
    message.className = "message error";
    return;
  }

  if (
    document.getElementById("email").validity.typeMismatch ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    message.innerText = "Enter a valid email address.";
    message.className = "message error";
    return;
  }

  /* Philippines mobile format: 09XXXXXXXXX or +639XXXXXXXXX */
  const normalizedPhone = phone.replace(/[\s-]/g, "");
  if (!/^(09\d{9}|\+639\d{9})$/.test(normalizedPhone)) {
    message.innerText = "Use a Philippine mobile number: 09XXXXXXXXX or +639XXXXXXXXX.";
    message.className = "message error";
    return;
  }

  if (password.length < 6) {
    message.innerText = "Password must be at least 6 characters.";
    message.className = "message error";
    return;
  }

  fetch("api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, phone: normalizedPhone, password })
  })
    .then(res => res.json())
    .then(data => {
      if (!data.ok) {
        message.innerText = data.message || "Registration failed.";
        message.className = "message error";
        return;
      }
      alert("🎉 Customer account created successfully!");
      window.location.href = "login.html";
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
