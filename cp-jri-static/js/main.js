(function () {
  const STORAGE_KEY = "cp-jri-lang";
  const html = document.documentElement;

  function setLang(lang) {
    html.setAttribute("data-lang", lang);
    localStorage.setItem(STORAGE_KEY, lang);
    document.querySelectorAll(".lang-toggle button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
  }

  const saved = localStorage.getItem(STORAGE_KEY) || "zh";
  setLang(saved);

  document.querySelectorAll(".lang-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  const searchInput = document.getElementById("news-search");
  const newsList = document.getElementById("news-list");
  if (searchInput && newsList) {
    const items = Array.from(newsList.querySelectorAll(".news-item"));
    searchInput.addEventListener("input", () => {
      const q = searchInput.value.trim().toLowerCase();
      items.forEach((el) => {
        const text = el.getAttribute("data-search") || "";
        const tags = el.getAttribute("data-tags") || "";
        const match =
          !q ||
          text.toLowerCase().includes(q) ||
          tags.toLowerCase().includes(q);
        el.classList.toggle("hidden", !match);
      });
    });
  }
})();
