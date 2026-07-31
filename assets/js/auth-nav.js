// Wechselt den Navbar-Button zwischen "Jetzt registrieren" und "Mein Konto",
// je nachdem, ob eine gültige Supabase-Sitzung vorliegt.
// Muss auf JEDER Seite eingebunden werden, die den Navbar-Button zeigt
// (nach supabase-client.js).

(function () {
  const REGISTER_HTML = 'Jetzt registrieren\n<svg class="bi bi-arrow-right" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#9C69E2" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"></path></svg>';

  const ACCOUNT_HTML = 'Mein Konto\n<svg class="bi bi-person-circle" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#9C69E2" viewBox="0 0 16 16"><path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"></path><path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 10.226 5.352 9 8 9s4.757 1.225 5.468 3.37A7 7 0 0 0 8 1z"></path></svg>';

  function applyAuthState(isLoggedIn) {
    const btn = document.getElementById('navbar-auth-btn');
    if (!btn) return;

    if (isLoggedIn) {
      btn.href = 'mein-konto.html';
      btn.innerHTML = ACCOUNT_HTML;
    } else {
      btn.href = 'registrieren.html';
      btn.innerHTML = REGISTER_HTML;
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
