// Kontaktformular — sendet Nachrichten per EmailJS direkt aus dem Browser.
// Trage hier deine eigenen EmailJS-Werte ein (siehe emailjs.com Dashboard):

const EMAILJS_PUBLIC_KEY = 'owVOQhW4JqRma_XOY';
const EMAILJS_SERVICE_ID = 'service_1loxvhn';
const EMAILJS_TEMPLATE_ID = 'template_87018zi';

document.addEventListener('DOMContentLoaded', function () {
  if (typeof emailjs === 'undefined') return;
  emailjs.init(EMAILJS_PUBLIC_KEY);

  const form = document.getElementById('kontakt-form');
  if (!form) return;

  const alertBox = document.getElementById('kontakt-alert');
  const submitBtn = document.getElementById('kontakt-submit-btn');

  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = 'alert alert-' + type;
    alertBox.classList.remove('d-none');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const name = document.getElementById('kontakt-name').value.trim();
    const email = document.getElementById('kontakt-email').value.trim();
    const message = document.getElementById('kontakt-nachricht').value.trim();

    if (!name || !email || !message) {
      showAlert('Bitte füllen Sie alle Felder aus.', 'danger');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird gesendet …';

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      from_name: name,
      from_email: email,
      message: message
    }).then(function () {
      showAlert('Ihre Nachricht wurde erfolgreich gesendet. Wir melden uns zeitnah bei Ihnen.', 'success');
      form.reset();
      submitBtn.disabled = false;
      submitBtn.textContent = 'Nachricht senden';
    }, function (error) {
      console.error('EmailJS-Fehler:', error);
      showAlert('Beim Senden ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut oder schreiben Sie direkt an info@fortbildungmed.de.', 'danger');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Nachricht senden';
    });
  });
});
