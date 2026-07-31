document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('login-form');
  if (!form) return;

  const alertBox = document.getElementById('login-alert');
  const submitBtn = document.getElementById('login-submit-btn');

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = 'alert alert-' + type;
    alertBox.classList.remove('d-none');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-passwort').value;

    if (!email || !password) {
      showAlert('Bitte E-Mail und Passwort eingeben.', 'danger');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Anmeldung läuft …';

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Anmelden';
      showAlert('Anmeldung fehlgeschlagen: Bitte prüfen Sie E-Mail und Passwort.', 'danger');
      return;
    }

    showAlert('Anmeldung erfolgreich! Sie werden weitergeleitet …', 'success');

    setTimeout(function () {
      window.location.href = 'index.html';
    }, 1000);
  });
});
