const VERIFICATION_BASE_URL = 'https://4bimcad.github.io/med/zertifikat.html';

function loadImageAsDataURL(url) {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Erzeugt automatisch ein Zertifikat für den kostenlosen Kurs direkt bei der Registrierung.
// Verwendet dieselbe Gestaltung wie die Zertifikate, die im Admin-Panel erstellt werden.
async function generateFreeCertificate(user, fullName, course) {
  const certificateNumber = 'FM-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);
  const verificationUrl = VERIFICATION_BASE_URL + '?nr=' + encodeURIComponent(certificateNumber);

  const qr = qrcode(0, 'M');
  qr.addData(verificationUrl);
  qr.make();
  const qrDataUrl = qr.createDataURL(6, 4);

  let logoDataUrl = null;
  try {
    logoDataUrl = await loadImageAsDataURL('assets/img/icons/logo.png');
  } catch (e) {
    console.error('Logo konnte nicht geladen werden:', e);
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = 297;

  doc.setFillColor(156, 105, 226);
  doc.rect(0, 0, pageWidth, 4, 'F');

  if (logoDataUrl) {
    const logoWidth = 42;
    const logoHeight = logoWidth * (79 / 300);
    doc.addImage(logoDataUrl, 'PNG', 15, 14, logoWidth, logoHeight);
  }

  doc.setFontSize(26);
  doc.setTextColor(40, 40, 40);
  doc.text('Teilnahmebescheinigung', pageWidth / 2, 48, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(100, 100, 100);
  doc.text('Verliehen an', pageWidth / 2, 62, { align: 'center' });

  doc.setFontSize(24);
  doc.setTextColor(20, 20, 20);
  doc.text(fullName || 'Teilnehmer/in', pageWidth / 2, 76, { align: 'center' });

  doc.setFontSize(13);
  doc.setTextColor(100, 100, 100);
  doc.text('für die erfolgreiche Teilnahme am Kurs', pageWidth / 2, 89, { align: 'center' });

  doc.setFontSize(19);
  doc.setTextColor(124, 58, 237);
  doc.text(course.title, pageWidth / 2, 100, { align: 'center' });

  doc.setFontSize(10.5);
  doc.setTextColor(90, 90, 90);
  const paragraph = doc.splitTextToSize(
    'Diese Bescheinigung würdigt das Engagement der teilnehmenden Person bei der Bearbeitung der ' +
    'Kursinhalte und dokumentiert die Teilnahme an dieser Fortbildung im Rahmen der beruflichen Weiterentwicklung.',
    170
  );
  doc.text(paragraph, pageWidth / 2, 112, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text('Kursdauer: ' + course.hours + ' Unterrichtseinheiten (UE)', pageWidth / 2, 132, { align: 'center' });
  doc.text('Ausgestellt am: ' + new Date().toLocaleDateString('de-DE'), pageWidth / 2, 140, { align: 'center' });

  doc.addImage(qrDataUrl, 'PNG', 250, 155, 30, 30);
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text('Verifizierung', 265, 188, { align: 'center' });
  doc.text(certificateNumber, 265, 192, { align: 'center' });

  const pdfBlob = doc.output('blob');

  // Präfix "free-" erlaubt Nutzern per RLS-Policy nur das Hochladen
  // von selbst ausgestellten Zertifikaten für kostenlose Kurse.
  const filePath = 'free-' + certificateNumber + '.pdf';

  const { error: uploadError } = await supabaseClient.storage
    .from('certificates')
    .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabaseClient.storage.from('certificates').getPublicUrl(filePath);

  const { error: insertError } = await supabaseClient
    .from('certificates')
    .insert({
      certificate_number: certificateNumber,
      user_id: user.id,
      course_id: course.id,
      full_name_snapshot: fullName || '',
      hours: course.hours,
      pdf_url: publicUrlData.publicUrl
    });

  if (insertError) throw insertError;
}

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

      // Automatische Einschreibung in den kostenlosen Kurs
      const { data: freeCourse } = await supabaseClient
        .from('courses')
        .select('id, title, hours')
        .eq('price', 0)
        .limit(1)
        .maybeSingle();

      if (freeCourse) {
        const { error: freeEnrollError } = await supabaseClient
          .from('enrollments')
          .insert({
            user_id: user.id,
            course_id: freeCourse.id,
            price_paid: 0
          });

        if (freeEnrollError) {
          console.error('Kostenloser Kurs konnte nicht automatisch hinzugefügt werden:', freeEnrollError);
        }

        // Zertifikat für den kostenlosen Kurs automatisch erzeugen
        try {
          await generateFreeCertificate(user, fullName, freeCourse);
        } catch (certErr) {
          console.error('Zertifikat für den kostenlosen Kurs konnte nicht automatisch erstellt werden:', certErr);
        }
      }
    }

    showAlert('Konto erfolgreich erstellt! Sie werden weitergeleitet …', 'success');

    setTimeout(function () {
      window.location.href = 'index.html';
    }, 1500);
  });
});
