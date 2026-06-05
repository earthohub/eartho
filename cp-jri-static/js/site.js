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
})();
