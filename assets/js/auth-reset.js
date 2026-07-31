document.addEventListener('DOMContentLoaded', async function () {
  const form = document.getElementById('reset-form');
  if (!form) return;

  const alertBox = document.getElementById('reset-alert');
  const submitBtn = document.getElementById('reset-submit-btn');

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = 'alert alert-' + type;
    alertBox.classList.remove('d-none');
  }

  // Supabase liest die Recovery-Session automatisch aus dem URL-Hash
  // (#access_token=...), wenn der Nutzer über den Link aus der E-Mail kommt.
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    showAlert('Dieser Link ist ungültig oder abgelaufen. Bitte fordern Sie einen neuen Link an.', 'danger');
    submitBtn.disabled = true;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const password = document.getElementById('reset-passwort').value;
    const passwordRepeat = document.getElementById('reset-passwort-wiederholen').value;

    if (!password || password.length < 8) {
      showAlert('Das Passwort muss mindestens 8 Zeichen lang sein.', 'danger');
      return;
    }
    if (password !== passwordRepeat) {
      showAlert('Die Passwörter stimmen nicht überein.', 'danger');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird gespeichert …';

    const { error } = await supabaseClient.auth.updateUser({ password: password });

    if (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Neues Passwort speichern';
      showAlert('Fehler beim Speichern: ' + error.message, 'danger');
      return;
    }

    showAlert('Passwort erfolgreich geändert! Sie werden zur Anmeldung weitergeleitet …', 'success');

    setTimeout(function () {
      window.location.href = 'login.html';
    }, 1500);
  });
});
