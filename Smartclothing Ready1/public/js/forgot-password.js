/* FORGOT PASSWORD */
// Verify the account, confirm an email OTP, then save the new password.

var verifyForm = document.getElementById("verifyForm");
var otpForm = document.getElementById("otpForm");
var resetForm = document.getElementById("resetForm");
var message = document.getElementById("message");
var subtitle = document.getElementById("subtitle");
var emailToReset = "";


// show red message
function showError(text) {
  message.innerText = text;
  message.className = "message error";
}

// show green message
function showSuccess(text) {
  message.innerText = text;
  message.className = "message success";
}

function sendOtp() {
  fetch("api/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "send_otp", email: emailToReset })
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!data.ok) {
        showError(data.message || "Could not send the verification code.");
        return;
      }
      showSuccess("If the account details match, a verification code has been sent to your email.");
    })
    .catch(function() {
      showError("Cannot reach the server. Is the SmartClo server running (run.bat) and are you on http://localhost:5000?");
    });
}


/* STEP 1 - VERIFY ACCOUNT AND SEND CODE */
verifyForm.addEventListener("submit", function(e) {
  e.preventDefault();

  var email = document.getElementById("email").value.trim().toLowerCase();
  if (email == "") {
    showError("Please enter your email address.");
    return;
  }

  // check email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError("Enter a valid email address.");
    return;
  }

  emailToReset = email;

  fetch("api/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "send_otp", email: email })
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!data.ok) {
        showError(data.message || "Could not send the verification code.");
        return;
      }
      verifyForm.hidden = true;
      otpForm.hidden = false;
      subtitle.innerText = "Enter the 6-digit code sent to your email. The code expires in 10 minutes. Can't find it? Check your spam folder.";
      showSuccess("If the account details match, a verification code has been sent to your email.");
      document.getElementById("otp").focus();
    })
    .catch(function() {
      showError("Cannot reach the server. Is the SmartClo server running (run.bat) and are you on http://localhost:5000?");
    });
});


/* STEP 2 - VERIFY EMAIL CODE */
otpForm.addEventListener("submit", function(e) {
  e.preventDefault();

  var otp = document.getElementById("otp").value.trim();
  if (!/^\d{6}$/.test(otp)) {
    showError("Enter the 6-digit code sent to your email.");
    return;
  }

  fetch("api/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "verify_otp", otp: otp })
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!data.ok) {
        showError(data.message || "The code is invalid or expired.");
        return;
      }
      otpForm.hidden = true;
      resetForm.hidden = false;
      subtitle.innerText = "Create a new password for " + emailToReset;
      showSuccess("Email verified. You can now set a new password.");
      document.getElementById("newPassword").focus();
    })
    .catch(function() {
      showError("Cannot reach the server. Is the SmartClo server running (run.bat) and are you on http://localhost:5000?");
    });
});

document.getElementById("resendCode").addEventListener("click", sendOtp);


/* STEP 3 - SAVE NEW PASSWORD */
resetForm.addEventListener("submit", function(e) {
  e.preventDefault();

  var newPassword = document.getElementById("newPassword").value;
  var confirmPassword = document.getElementById("confirmPassword").value;

  if (newPassword.trim() == "" || confirmPassword.trim() == "") {
    showError("Please fill in both password fields.");
    return;
  }

  if (newPassword.length < 6) {
    showError("Password must be at least 6 characters.");
    return;
  }

  if (newPassword != confirmPassword) {
    showError("Passwords do not match.");
    return;
  }

  // save the new password in MySQL
  fetch("api/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reset", password: newPassword })
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (!data.ok) {
        showError(data.message || "Could not change the password.");
        return;
      }
      // hide the form so they can't click it again
      resetForm.hidden = true;
      subtitle.innerText = "Your password was changed.";
      showSuccess("Password changed successfully! Going to login...");
      setTimeout(function() {
        window.location.href = "login.html";
      }, 1500);
    })
    .catch(function() {
      showError("Cannot reach the server. Is the SmartClo server running (run.bat) and are you on http://localhost:5000?");
    });
});


/* SHOW / HIDE PASSWORD BUTTONS */
function setupToggle(buttonId, inputId) {
  var button = document.getElementById(buttonId);
  var input = document.getElementById(inputId);

  button.addEventListener("click", function() {
    if (input.type == "password") {
      input.type = "text";
      button.innerText = "Hide";
      button.setAttribute("aria-label", "Hide password");
    } else {
      input.type = "password";
      button.innerText = "Show";
      button.setAttribute("aria-label", "Show password");
    }
  });
}

setupToggle("toggleNew", "newPassword");
setupToggle("toggleConfirm", "confirmPassword");
