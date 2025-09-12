(function () {
  const LOGIN_URL = 'http://localhost:5678/api/users/login';

  const form = document.getElementById('login-form');
  if (!form) return;

  form.setAttribute('action', '');
  form.setAttribute('novalidate', 'novalidate');

  const email = document.getElementById('login-email');
  const password = document.getElementById('login-password');
  const err = form.querySelector('.login-error');
  const submit = form.querySelector('input[type="submit"]');

  const showError = (msg) => { err.textContent = msg || ''; };

  // ---- helper qui retourne toujours une string lisible ----
  function extractErrorMessage(data, res) {
    const candidates = [
      data && data.error && data.error.message,
      data && data.error && typeof data.error === 'string' ? data.error : null,
      data && data.message,
      data && data.errors && Array.isArray(data.errors) && data.errors[0] && (data.errors[0].message || data.errors[0]),
      typeof data === 'string' ? data : null,
    ].filter(Boolean);

    // si on a une chaîne exploitable
    if (candidates.length && typeof candidates[0] === 'string') return candidates[0];

    // fallback par statut
    if (res && (res.status === 400 || res.status === 401)) return 'Identifiants invalides.';
    if (res && res.status) return `Erreur ${res.status}`;
    return 'Une erreur est survenue.';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');

    const emailVal = (email.value || '').trim();
    const passVal  = (password.value || '').trim();

    const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal);
    if (!emailLike) { showError("Veuillez saisir une adresse e-mail valide."); email.focus(); return; }
    if (!passVal)   { showError("Le mot de passe est requis."); password.focus(); return; }

    submit.disabled = true;

    try {
      const res = await fetch(LOGIN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal, password: passVal })
      });

      if (!res.ok) {
        let data = null;
        try { data = await res.json(); } catch (_) {}
        const msg = extractErrorMessage(data, res);
        throw new Error(String(msg)); // <--- toujours une string
      }

      const data = await res.json(); // attendu : { userId, token }
      if (!data?.token || typeof data.userId === 'undefined') {
        throw new Error('Réponse serveur inattendue.');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', String(data.userId));

      window.location.href = 'index.html';
    } catch (e2) {
      showError((e2 && e2.message) || 'Erreur réseau.');
    } finally {
      submit.disabled = false;
    }
  });
})();
