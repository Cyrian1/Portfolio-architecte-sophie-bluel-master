// URL de l'API qui renvoie la liste des travaux
const API_URL = "http://localhost:5678/api/works";

// Fonction qui va créer une figure (image + légende) pour chaque projet
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

// Fonction qui va récupérer les projets et les afficher
function loadGallery() {
  fetch(API_URL)
    .then(response => response.json())
    .then(works => {
      const gallery = document.querySelector(".gallery");

      works.forEach(work => {
        const figure = createFigure(work);
        gallery.appendChild(figure);
      });
    })
}

// Quand la page est chargée, on lance la fonction
document.addEventListener("DOMContentLoaded", loadGallery);
