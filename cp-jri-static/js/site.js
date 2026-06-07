(function () {
  var KEY = "jrice-lang";
  var html = document.documentElement;

  function setLang(lang) {
    html.setAttribute("data-lang", lang);
    try {
      localStorage.setItem(KEY, lang);
    } catch (e) {}
    document.querySelectorAll(".lang button").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === lang);
    });
  }

  var saved = "en";
  try {
    saved = localStorage.getItem(KEY) || "en";
  } catch (e) {}
  setLang(saved);

  document.querySelectorAll(".lang button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLang(btn.getAttribute("data-lang"));
    });
  });

  var input = document.getElementById("news-search");
  var list = document.getElementById("news-list");
  if (input && list) {
    var items = list.querySelectorAll("li");
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      items.forEach(function (li) {
        var hay = (li.getAttribute("data-search") || "").toLowerCase();
        li.classList.toggle("hidden", q && hay.indexOf(q) === -1);
      });
    });
  }

  var lightbox = document.getElementById("lightbox");
  var lightboxImg = lightbox && lightbox.querySelector(".lightbox-img");
  var closeBtn = lightbox && lightbox.querySelector(".lightbox-close");

  function openLightbox(src) {
    if (!lightbox || !lightboxImg) return;
    lightboxImg.src = src;
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox || !lightboxImg) return;
    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImg.src = "";
    document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-lightbox]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      var href = el.getAttribute("href");
      if (href) openLightbox(href);
    });
  });

  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLightbox();
  });
})();
