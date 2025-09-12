// Page d'accueil : galerie + filtres + UI "connecté" (bandeau, logout, bouton "modifier").
// SÉCURITÉ : ce fichier s'auto-désactive sur toute page qui n'a pas #portfolio/.gallery.

(function () {
  // --- Ne rien faire si on n'est pas sur l'accueil
  const onHome = document.getElementById("portfolio") && document.querySelector(".gallery");
  if (!onHome) return;

  const WORKS_URL = "http://localhost:5678/api/works";
  const CATEGORIES_URL = "http://localhost:5678/api/categories";

  const gallery = document.querySelector(".gallery");
  const filters = document.getElementById("filters");

  let ALL_WORKS = [];
  let ACTIVE_CATEGORY = "all";

  // ---------- Helpers UI connecté ----------
  const isLoggedIn = () => !!localStorage.getItem("token");

  // Charger Font Awesome (sans toucher au HTML)
  function ensureFontAwesome() {
    if (document.querySelector('link[data-fa]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css';
    link.setAttribute('data-fa', '1');
    document.head.appendChild(link);
  }

  function ensureAdminBar() {
    if (document.querySelector(".admin-bar")) return;
    const bar = document.createElement("div");
    bar.className = "admin-bar";
    bar.innerHTML = `
      <i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>
      <span>Mode édition</span>
    `;
    // insère au tout début du body
    document.body.insertBefore(bar, document.body.firstChild);
    // décale le contenu
    document.body.classList.add('connected');
  }

  function switchLoginToLogout() {
    const loginLink =
      document.querySelector('nav a[href="login.html"]') ||
      Array.from(document.querySelectorAll("nav a")).find(a => a.textContent.trim().toLowerCase() === "login");

    if (!loginLink) return;

    loginLink.textContent = "logout";
    loginLink.href = "#";
    loginLink.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      window.location.reload(); // retour à l'état non connecté
    }, { once: true });
  }

  function hideFilters() {
    document.body.classList.add("connected");
    if (filters) filters.style.display = "none";
  }

  function ensureEditButton() {
    const portfolio = document.getElementById("portfolio");
    if (!portfolio) return;
    const h2 = portfolio.querySelector("h2");
    if (!h2 || portfolio.querySelector(".titlebar")) return;

    const titlebar = document.createElement("div");
    titlebar.className = "titlebar";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "edit-btn";
    editBtn.innerHTML = `
      <i class="fa-regular fa-pen-to-square" aria-hidden="true"></i>
      <span>modifier</span>
    `;
    editBtn.addEventListener("click", (e) => e.preventDefault()); // placeholder pour la prochaine mission

    // place h2 + bouton au centre
    portfolio.insertBefore(titlebar, h2);
    titlebar.appendChild(h2);
    titlebar.appendChild(editBtn);
  }

  function applyConnectedUIIfNeeded() {
    if (!isLoggedIn()) return;
    ensureFontAwesome();
    ensureAdminBar();
    switchLoginToLogout();
    hideFilters();
    ensureEditButton();
  }

  // ---------- Gallerie + filtres (inchangé dans l'esprit) ----------
  function createFigure(work) {
    const figure = document.createElement("figure");
    const img = document.createElement("img");
    img.src = work.imageUrl;
    img.alt = work.title;
    img.loading = "lazy";
    const caption = document.createElement("figcaption");
    caption.textContent = work.title;
    figure.appendChild(img);
    figure.appendChild(caption);
    return figure;
  }

  function renderGallery() {
    if (!gallery) return;
    gallery.innerHTML = "";
    const list = ACTIVE_CATEGORY === "all"
      ? ALL_WORKS
      : ALL_WORKS.filter(w => String(w.categoryId) === String(ACTIVE_CATEGORY));
    list.forEach(w => gallery.appendChild(createFigure(w)));
  }

  function updateActiveButton() {
    if (!filters) return;
    filters.querySelectorAll("button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.category === String(ACTIVE_CATEGORY));
    });
  }

  function renderFilters(categories) {
    if (!filters) return;
    filters.innerHTML = "";

    const btnAll = document.createElement("button");
    btnAll.textContent = "Tous";
    btnAll.dataset.category = "all";
    btnAll.classList.add("active");
    btnAll.addEventListener("click", () => {
      ACTIVE_CATEGORY = "all";
      updateActiveButton();
      renderGallery();
    });
    filters.appendChild(btnAll);

    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.textContent = cat.name;
      btn.dataset.category = String(cat.id);
      btn.addEventListener("click", () => {
        ACTIVE_CATEGORY = cat.id;
        updateActiveButton();
        renderGallery();
      });
      filters.appendChild(btn);
    });
  }

  async function init() {
    // 1) Filtres
    try {
      const catRes = await fetch(CATEGORIES_URL);
      renderFilters(await catRes.json());
    } catch {
      if (filters) filters.innerHTML = '<button disabled>Filtres indisponibles</button>';
    }

    // 2) Travaux
    try {
      const worksRes = await fetch(WORKS_URL);
      const works = await worksRes.json();
      ALL_WORKS = works.map(w => ({
        id: w.id,
        title: w.title,
        imageUrl: w.imageUrl,
        categoryId: w.categoryId ?? (w.category ? w.category.id : null)
      }));
      renderGallery();
      if (!ALL_WORKS.length && gallery) gallery.innerHTML = '<p>Aucun projet pour le moment.</p>';
    } catch {
      if (gallery) gallery.innerHTML = '<p>Impossible de charger les projets.</p>';
    }

    // 3) État connecté
    applyConnectedUIIfNeeded();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
