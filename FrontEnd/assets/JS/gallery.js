
(function () {

  const onHome = document.getElementById("portfolio") && document.querySelector(".gallery");
  if (!onHome) return;

  const API_BASE = "http://localhost:5678/api";
  const WORKS_URL = `${API_BASE}/works`;
  const CATEGORIES_URL = `${API_BASE}/categories`;

  const gallery = document.querySelector(".gallery");
  const filters = document.getElementById("filters");

  let ALL_WORKS = [];
  let ACTIVE_CATEGORY = "all";

  // ============ CONNECTÉ ============
  const isLoggedIn = () => !!localStorage.getItem("token");
  const authHeader = () => ({ "Authorization": `Bearer ${localStorage.getItem('token')}` });

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
    bar.innerHTML = `<i class="fa-regular fa-pen-to-square" aria-hidden="true"></i><span>Mode édition</span>`;
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add('connected'); // padding-top géré en CSS
  }

  function switchLoginToLogout() {
    const loginLink =
      document.querySelector('nav a[href="login.html"]') ||
      Array.from(document.querySelectorAll("nav a"))
        .find(a => a.textContent.trim().toLowerCase() === "login");

    if (!loginLink) return;
    loginLink.textContent = "logout";
    loginLink.href = "#";
    loginLink.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      window.location.reload();
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
    editBtn.innerHTML = `<i class="fa-regular fa-pen-to-square" aria-hidden="true"></i><span>modifier</span>`;
    editBtn.addEventListener("click", openModal);

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

  // ============ MODALE ============
  let overlayEl = null;
  let modalEl = null;
  let lastFocused = null;

  // refs Vue 2 (ajout)
  let addForm = null, addFileInput = null, addPreview = null, addZone = null,
    addTitle = null, addCatSelect = null, addSubmit = null, formError = null;

  function buildModalOnce() {
    if (overlayEl && modalEl) return;

    // overlay
    overlayEl = document.createElement('div');
    overlayEl.className = 'modal-overlay';

    // modal
    modalEl = document.createElement('div');
    modalEl.className = 'modal';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');

    modalEl.innerHTML = `
      <div class="modal-head">
    <button class="modal-back" aria-label="Retour" style="display:none;">
      <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
    </button>
    <button class="modal-close" aria-label="Fermer">×</button>
  </div>
      <h3 class="modal-title">Galerie photo</h3>

      <!-- Vue 1 : galerie + bouton "Ajouter une photo" -->
      <div class="modal-view modal-gallery">
        <div class="modal-grid" aria-live="polite"></div>
        <div class="divider"></div>
        <div class="actions"><button class="btn-primary btn-open-add" type="button">Ajouter une photo</button></div>
      </div>

      <!-- Vue 2 : ajout photo -->
      <div class="modal-view modal-add hidden">
        <div class="upload">
          <div class="preview"><img alt=""></div>
          <div class="placeholder">
            <i class="fa-regular fa-image" style="font-size:46px; color:#B9C5CC;"></i>
            <label class="pick">
              + Ajouter photo
              <input type="file" accept="image/jpeg,image/png" style="display:none" />
            </label>
            <div class="hint">jpg, png • 4mo max</div>
          </div>
        </div>

        <form class="add-form" novalidate>
          <div>
            <label for="add-title">Titre</label>
            <input id="add-title" name="title" type="text" />
          </div>
          <div>
            <label for="add-cat">Catégorie</label>
            <select id="add-cat" name="category">
              <option value=""></option> <!-- vide par défaut -->
            </select>
          </div>
        </form>
        <div class="divider"></div>
        <div class="actions"><button class="btn-primary" id="add-submit" type="button" disabled>Valider</button></div>
        <p class="form-error" aria-live="polite"></p>
      </div>
    `;

    // close / outside
    modalEl.querySelector('.modal-close').addEventListener('click', closeModal);
    overlayEl.addEventListener('click', (e) => { if (e.target === overlayEl) closeModal(); });

    // switch vues
    modalEl.querySelector('.btn-open-add').addEventListener('click', () => switchView('add'));
    modalEl.querySelector('.modal-back').addEventListener('click', () => switchView('gallery'));

    // refs vue 2
    addForm = modalEl.querySelector('form.add-form');
    addFileInput = modalEl.querySelector('input[type="file"]');
    addPreview = modalEl.querySelector('.preview');
    addZone = modalEl.querySelector('.upload');
    addTitle = modalEl.querySelector('#add-title');
    addCatSelect = modalEl.querySelector('#add-cat');
    addSubmit = modalEl.querySelector('#add-submit');
    formError = modalEl.querySelector('.form-error');

    // handlers vue 2
    addFileInput.addEventListener('change', onPickFile);
    addTitle.addEventListener('input', updateAddButtonState);
    addCatSelect.addEventListener('change', updateAddButtonState);
    addSubmit.addEventListener('click', submitAdd);   // <-- attache ici (après refs)

    document.body.appendChild(overlayEl);
    document.body.appendChild(modalEl);
  }

  function switchView(view) {
    const vGallery = modalEl.querySelector('.modal-gallery');
    const vAdd = modalEl.querySelector('.modal-add');
    const title = modalEl.querySelector('.modal-title');
    const back = modalEl.querySelector('.modal-back');

    if (view === 'add') {
      title.textContent = 'Ajout photo';
      vGallery.classList.add('hidden');
      vAdd.classList.remove('hidden');
      back.style.display = '';
    } else {
      title.textContent = 'Galerie photo';
      vAdd.classList.add('hidden');
      vGallery.classList.remove('hidden');
      back.style.display = 'none';
      resetAddForm();
    }
  }

  function openModal(e) {
    e?.preventDefault?.();
    if (!isLoggedIn()) return;

    ensureFontAwesome();
    buildModalOnce();
    renderModalGallery();    // remplit la grille
    populateCategories();    // remplit le select (vue ajout)

    lastFocused = document.activeElement;

    overlayEl.classList.add('open');
    modalEl.classList.add('open');
    document.body.classList.add('modal-open');
    document.addEventListener('keydown', onKeydownEsc);
  }

  function closeModal() {
    if (!overlayEl || !modalEl) return;
    overlayEl.classList.remove('open');
    modalEl.classList.remove('open');
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onKeydownEsc);
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
    switchView('gallery'); // reset vue par défaut
  }

  function onKeydownEsc(ev) {
    if (ev.key === 'Escape' || ev.key === 'Esc') { ev.preventDefault(); closeModal(); }
  }

  // ===== Vue 1 : GALERIE + SUPPRESSION =====
  function renderModalGallery() {
    const grid = modalEl.querySelector('.modal-grid');
    grid.innerHTML = '';

    if (!ALL_WORKS.length) {
      grid.innerHTML = `<p style="grid-column:1/-1; text-align:center; opacity:.7;">Aucune image.</p>`;
      return;
    }

    ALL_WORKS.forEach(w => {
      const cell = document.createElement('div');
      cell.className = 'thumb';
      cell.dataset.id = w.id;

      const img = document.createElement('img');
      img.src = w.imageUrl; img.alt = w.title; img.loading = 'lazy';

      const del = document.createElement('button');
      del.className = 'thumb-del';
      del.innerHTML = `<i class="fa-solid fa-trash-can" aria-hidden="true"></i>`;

      del.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm("Supprimer ce projet ?")) return;
        try {
          const id = w.id;
          const res = await fetch(`${WORKS_URL}/${id}`, { method: 'DELETE', headers: authHeader() });
          if (res.status === 401) return handleUnauthorized();
          if (!res.ok) return alert("Suppression impossible.");

          // succès : retire du modèle et du DOM (modale + page) sans recharger
          ALL_WORKS = ALL_WORKS.filter(x => String(x.id) !== String(id));
          cell.remove();

          // Si plus rien, message vide
          if (!modalEl.querySelector('.modal-grid .thumb')) {
            renderModalGallery();
          }

          // page principale
          const fig = gallery.querySelector(`figure[data-id="${id}"]`);
          if (fig) fig.remove();
        } catch {
          alert("Erreur réseau. Réessayez.");
        }
      });

      cell.append(img, del);
      grid.appendChild(cell);
    });
  }

  function handleUnauthorized() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    alert("Session expirée. Veuillez vous reconnecter.");
    window.location.href = 'login.html';
  }

  // ===== Vue 2 : AJOUT PHOTO =====
  async function populateCategories() {
    // évite les doublons si déjà rempli
    if (addCatSelect.options.length > 1) return;
    try {
      const res = await fetch(CATEGORIES_URL);
      const cats = await res.json();
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = String(c.id);
        opt.textContent = c.name;
        addCatSelect.appendChild(opt);
      });
    } catch { /* laisse vide en cas d'erreur */ }
  }

  function onPickFile() {
    formError.textContent = '';
    const f = addFileInput.files[0];
    if (!f) { hidePreview(); updateAddButtonState(); return; }

    const okType = /image\/(jpeg|png)/.test(f.type);
    const okSize = f.size <= 4 * 1024 * 1024;
    if (!okType || !okSize) {
      hidePreview();
      formError.textContent = "Fichier invalide (jpg/png, 4Mo max).";
      addFileInput.value = '';
      updateAddButtonState();
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = addPreview.querySelector('img');
      img.src = reader.result;
      showPreview();
      updateAddButtonState();
    };
    reader.readAsDataURL(f);
  }

  function showPreview() {
    addPreview.style.display = 'flex';
    addZone.querySelector('.placeholder').style.display = 'none';
  }
  function hidePreview() {
    addPreview.style.display = 'none';
    addPreview.querySelector('img').src = '';
    addZone.querySelector('.placeholder').style.display = '';
  }

  function updateAddButtonState() {
    const hasFile = !!(addFileInput.files && addFileInput.files[0]);
    const hasTitle = (addTitle.value || '').trim().length > 0;
    const hasCat = (addCatSelect.value || '') !== '';
    addSubmit.disabled = !(hasFile && hasTitle && hasCat);
  }

  async function submitAdd() {
    formError.textContent = '';
    if (addSubmit.disabled) return;

    const f = addFileInput.files[0];
    if (!f || !(addTitle.value || '').trim() || !(addCatSelect.value || '')) {
      formError.textContent = "Tous les champs sont nécessaires";
      return;
    }

    const fd = new FormData();
    fd.append('image', f);
    fd.append('title', (addTitle.value || '').trim());
    fd.append('category', addCatSelect.value); // integer string OK

    try {
      const res = await fetch(WORKS_URL, {
        method: 'POST',
        headers: authHeader(),
        body: fd
      });
      if (res.status === 401) return handleUnauthorized();
      if (!res.ok) {
        formError.textContent = (res.status === 400)
          ? "Tous les champs sont nécessaires"
          : "Échec de l'envoi. Réessayez.";
        return;
      }

      // Succès : on ferme la modale et on reste sur l'accueil 
      closeModal();
    } catch {
      formError.textContent = "Le serveur ne répond pas. Réessayez.";
    }
  }

  function resetAddForm() {
    if (!addForm) return;
    addForm.reset();
    hidePreview();
    formError.textContent = '';
    updateAddButtonState();
  }

  // ============ GALERIE + FILTRES ============
  function createFigure(work) {
    const figure = document.createElement("figure");
    figure.dataset.id = work.id; // utile pour suppression live
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
    } catch { if (filters) filters.innerHTML = '<button disabled>Filtres indisponibles</button>'; }

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
    } catch { if (gallery) gallery.innerHTML = '<p>Impossible de charger les projets.</p>'; }

    // 3) État connecté
    applyConnectedUIIfNeeded();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
