document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
      var expanded = nav.classList.contains("open");
      toggle.setAttribute("aria-expanded", String(expanded));
    });
  }

  var mobileQuery = window.matchMedia("(max-width: 860px)");
  document.querySelectorAll(".has-dropdown").forEach(function (item) {
    var link = item.querySelector(":scope > a");
    if (!link) return;
    link.setAttribute("aria-expanded", "false");
    link.addEventListener("click", function (e) {
      if (!mobileQuery.matches) return;
      if (item.classList.contains("open")) return; // second tap: let it navigate
      e.preventDefault();
      item.classList.add("open");
      link.setAttribute("aria-expanded", "true");
    });
  });
});
