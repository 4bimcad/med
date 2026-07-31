document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('forgot-form');
  if (!form) return;

  const alertBox = document.getElementById('forgot-alert');
  const submitBtn = document.getElementById('forgot-submit-btn');

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = 'alert alert-' + type;
    alertBox.classList.remove('d-none');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('reset-email').value.trim();

    if (!email) {
      showAlert('Bitte geben Sie Ihre E-Mail-Adresse ein.', 'danger');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird gesendet …';

    // Baut die Redirect-URL relativ zur aktuellen Seite,
    // damit es sowohl auf GitHub Pages (/med/) als auch später
    // auf der eigenen Domain funktioniert.
    const redirectTo = window.location.href.replace('passwort-vergessen.html', 'passwort-zuruecksetzen.html');

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo
    });

    submitBtn.disabled = false;
    submitBtn.textContent = 'Link zum Zurücksetzen senden';

    // Aus Sicherheitsgründen immer dieselbe Meldung anzeigen,
    // unabhängig davon, ob ein Konto mit dieser E-Mail existiert.
    showAlert('Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Link zum Zurücksetzen des Passworts gesendet.', 'success');

    if (error) {
      console.error('Reset-Fehler:', error);
    }
  });
});
