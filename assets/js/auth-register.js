document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('reg-form');
  if (!form) return;

  const alertBox = document.getElementById('reg-alert');
  const submitBtn = document.getElementById('reg-submit-btn');

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = 'alert alert-' + type;
    alertBox.classList.remove('d-none');
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const fullName = document.getElementById('reg-name').value.trim();
    const beruf = document.getElementById('reg-beruf').value;
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-passwort').value;
    const agb = document.getElementById('reg-agb').checked;

    if (!fullName) {
      showAlert('Bitte geben Sie Ihren Namen ein.', 'danger');
      return;
    }
    if (!beruf || beruf === 'Bitte wählen …') {
      showAlert('Bitte wählen Sie Ihre Berufsgruppe.', 'danger');
      return;
    }
    if (!email) {
      showAlert('Bitte geben Sie eine gültige E-Mail-Adresse ein.', 'danger');
      return;
    }
    if (!password || password.length < 8) {
      showAlert('Das Passwort muss mindestens 8 Zeichen lang sein.', 'danger');
      return;
    }
    if (!agb) {
      showAlert('Bitte akzeptieren Sie die Datenschutzerklärung und die Nutzungsbedingungen.', 'danger');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird erstellt …';

    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          berufsgruppe: beruf
        }
      }
    });

    if (error) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Konto erstellen';
      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already been registered')) {
        showAlert('Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an.', 'danger');
      } else {
        showAlert('Fehler bei der Registrierung: ' + error.message, 'danger');
      }
      return;
    }

    const user = data.user;

    if (user) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          id: user.id,
          full_name: fullName,
          berufsgruppe: beruf,
          email: email
        });

      if (profileError) {
        console.error('Profil konnte nicht gespeichert werden:', profileError);
      }
    }

    showAlert('Konto erfolgreich erstellt! Sie werden weitergeleitet …', 'success');

    setTimeout(function () {
      window.location.href = 'index.html';
    }, 1500);
  });
});
