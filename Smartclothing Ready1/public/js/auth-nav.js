(function() {
  window.toggleMenu = function() {
    const nav = document.querySelector(".navbar .navlinks");
    const button = document.querySelector(".navbar .menu");

    if (!nav || !button) return;

    const isOpen = nav.classList.toggle("menu-open");
    button.setAttribute("aria-expanded", String(isOpen));
  };

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem("currentUser")) || null;
    } catch (error) {
      return null;
    }
  }

  window.isClientLoggedIn = function() {
    const currentUser = getCurrentUser();
    return Boolean(currentUser && typeof currentUser.email === "string" && currentUser.email.trim());
  };

  function updateAuthNavigation() {
    const isLoggedIn = window.isClientLoggedIn();

    document.querySelectorAll('.navlinks a[href="my-orders.html"]').forEach(function(link) {
      link.hidden = !isLoggedIn;
    });

    document.querySelectorAll("[data-requires-login]").forEach(function(element) {
      element.hidden = !isLoggedIn;
    });

    document.querySelectorAll("[data-auth-link]").forEach(function(link) {
      link.textContent = isLoggedIn ? "Logout" : "Login";
      link.href = isLoggedIn ? "#" : "login.html";
    });

    if (!isLoggedIn && /(?:^|\/)cart\.html$/.test(window.location.pathname)) {
      window.location.replace("login.html");
    }

    if (!isLoggedIn && /(?:^|\/)my-orders\.html$/.test(window.location.pathname)) {
      window.location.replace("login.html");
    }
  }

  document.querySelectorAll("[data-auth-link]").forEach(function(link) {
    link.addEventListener("click", function(event) {
      if (!window.isClientLoggedIn()) return;

      event.preventDefault();
      localStorage.removeItem("currentUser");
      fetch("api/logout").finally(function() { window.location.href = "index.html"; });
    });
  });

  window.addEventListener("storage", updateAuthNavigation);
  updateAuthNavigation();
})();
