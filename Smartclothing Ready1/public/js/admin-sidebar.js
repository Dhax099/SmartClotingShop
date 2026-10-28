(function() {
  const currentAdmin = JSON.parse(localStorage.getItem("currentAdmin") || "null");
  const name = currentAdmin && (currentAdmin.name || currentAdmin.email);
  const adminName = document.getElementById("adminName");
  const avatar = document.getElementById("avatar");

  if (name && adminName) adminName.textContent = name;
  if (name && avatar) avatar.textContent = name.charAt(0).toUpperCase();

  window.mobileMenu = function() {
    const sidebar = document.querySelector(".sidebar");
    const button = document.querySelector(".mobile-menu");
    if (!sidebar || !button) return;

    const isOpen = sidebar.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
  };
})();
