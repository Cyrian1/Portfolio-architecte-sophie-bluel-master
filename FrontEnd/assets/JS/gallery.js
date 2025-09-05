// assets/js/gallery.js
// Objectif : charger les travaux + catégories, afficher la galerie,
// et filtrer par catégorie. Code simple, clair, et commenté.

const WORKS_URL = "http://localhost:5678/api/works";
const CATEGORIES_URL = "http://localhost:5678/api/categories";

const gallery = document.querySelector(".gallery");
const filters = document.getElementById("filters");

let ALL_WORKS = [];      // tous les travaux
let ACTIVE_CATEGORY = "all"; // "all" = bouton "Tous"

// Crée un <figure> avec l'image et le titre
function createFigure(work) {
  const figure = document.createElement("figure");
  const img = document.createElement("img");
  img.src = work.imageUrl;
  img.alt = work.title;
  const caption = document.createElement("figcaption");
  caption.textContent = work.title;
  figure.appendChild(img);
  figure.appendChild(caption);
  return figure;
}

// Affiche la galerie selon la catégorie active
function renderGallery() {
  gallery.innerHTML = ""; // on vide

  // si "all", on affiche tout, sinon on filtre par categoryId
  const list = ACTIVE_CATEGORY === "all"
    ? ALL_WORKS
    : ALL_WORKS.filter(w => String(w.categoryId) === String(ACTIVE_CATEGORY));

  list.forEach(work => {
    gallery.appendChild(createFigure(work));
  });
}

// Met à jour le style du bouton actif
function updateActiveButton() {
  const buttons = filters.querySelectorAll("button");
  buttons.forEach(btn => {
    const isActive = btn.dataset.category === String(ACTIVE_CATEGORY);
    if (isActive) btn.classList.add("active");
    else btn.classList.remove("active");
  });
}

// Construit les boutons (Tous + catégories)
function renderFilters(categories) {
  filters.innerHTML = "";

  // bouton "Tous"
  const btnAll = document.createElement("button");
  btnAll.textContent = "Tous";
  btnAll.dataset.category = "all";
  btnAll.classList.add("active"); // actif par défaut
  btnAll.addEventListener("click", () => {
    ACTIVE_CATEGORY = "all";
    updateActiveButton();
    renderGallery();
  });
  filters.appendChild(btnAll);

  // boutons depuis l'API
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

// Charge les données puis construit l'UI
async function init() {
  // 1) catégories (pour les boutons)
  const catRes = await fetch(CATEGORIES_URL);
  const categories = await catRes.json();
  renderFilters(categories);

  // 2) travaux (pour la galerie)
  const worksRes = await fetch(WORKS_URL);
  const works = await worksRes.json();

  // on garde un champ categoryId sur chaque work
  ALL_WORKS = works.map(w => ({
    id: w.id,
    title: w.title,
    imageUrl: w.imageUrl,
    categoryId: w.categoryId ?? (w.category ? w.category.id : null)
  }));

  // 3) affichage initial : Tous
  renderGallery();
}

document.addEventListener("DOMContentLoaded", init);
