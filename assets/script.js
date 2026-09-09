document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("mainNav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
    });
  }

  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    q.addEventListener("click", function () {
      var wasOpen = item.classList.contains("open");
      item.parentElement.querySelectorAll(".faq-item").forEach(function (i) {
        i.classList.remove("open");
      });
      if (!wasOpen) item.classList.add("open");
    });
  });

  // Gauge needle angle: 0 band -> -90deg, 9 band -> 90deg
  document.querySelectorAll("[data-band]").forEach(function (el) {
    var band = parseFloat(el.getAttribute("data-band"));
    var angle = (band / 9) * 180 - 90;
    el.style.setProperty("--needle-angle", angle + "deg");
  });
});
