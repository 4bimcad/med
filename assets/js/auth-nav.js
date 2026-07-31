// Wechselt den Navbar-Button zwischen "Registrieren / Anmelden" und "Mein Konto",
// je nachdem, ob eine gültige Supabase-Sitzung vorliegt.
// Wenn eingeloggt, wird zusätzlich ein kleiner Abmelden-Button links daneben angezeigt.
// Muss auf JEDER Seite eingebunden werden, die den Navbar-Button zeigt
// (nach supabase-client.js).

(function () {
  const REGISTER_HTML = 'Registrieren / Anmelden\n<svg class="bi bi-box-arrow-in-right" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#9C69E2" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0v-2z"></path><path fill-rule="evenodd" d="M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"></path></svg>';

  const ACCOUNT_HTML = 'Mein Konto\n<svg class="bi bi-person-circle" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#9C69E2" viewBox="0 0 16 16"><path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"></path><path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 10.226 5.352 9 8 9s4.757 1.225 5.468 3.37A7 7 0 0 0 8 1z"></path></svg>';

  const LOGOUT_ICON_HTML = '<svg class="bi bi-box-arrow-right" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0v2z"></path><path fill-rule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"></path></svg>';

  function ensureLogoutButton(form) {
    let logoutBtn = document.getElementById('navbar-logout-btn');
    if (!logoutBtn) {
      logoutBtn = document.createElement('button');
      logoutBtn.type = 'button';
      logoutBtn.id = 'navbar-logout-btn';
      logoutBtn.className = 'btn btn-light rounded-circle shadow d-none me-2';
      logoutBtn.setAttribute('aria-label', 'Abmelden');
      logoutBtn.title = 'Abmelden';
      logoutBtn.style.width = '38px';
      logoutBtn.style.height = '38px';
      logoutBtn.style.display = 'inline-flex';
      logoutBtn.style.alignItems = 'center';
      logoutBtn.style.justifyContent = 'center';
      logoutBtn.style.padding = '0';
      logoutBtn.innerHTML = LOGOUT_ICON_HTML;
      logoutBtn.addEventListener('click', async function () {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
      });

      const accountBtn = document.getElementById('navbar-auth-btn');
      form.insertBefore(logoutBtn, accountBtn);
    }
    return logoutBtn;
  }

  function applyAuthState(isLoggedIn) {
    const btn = document.getElementById('navbar-auth-btn');
    const form = document.getElementById('navbar-auth-form');
    if (!btn || !form) return;

    const logoutBtn = ensureLogoutButton(form);

    if (isLoggedIn) {
      btn.href = 'mein-konto.html';
      btn.innerHTML = ACCOUNT_HTML;
      logoutBtn.classList.remove('d-none');
      form.classList.add('align-items-center');
    } else {
      btn.href = 'registrieren.html';
      btn.innerHTML = REGISTER_HTML;
      logoutBtn.classList.add('d-none');
    }
  }

  document.addEventListener('DOMContentLoaded', async function () {
    if (typeof supabaseClient === 'undefined') return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    applyAuthState(!!session);

    // Reagiert live auf Login/Logout, ohne dass die Seite neu geladen werden muss
    supabaseClient.auth.onAuthStateChange(function (event, session) {
      applyAuthState(!!session);
    });
  });
})();

