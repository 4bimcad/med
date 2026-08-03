// Admin-Panel für FortbildungMed.de
// Nutzer suchen, Zahlungen manuell vermerken, Zertifikate mit QR-Code erstellen.

(async function () {
  if (typeof supabaseClient === 'undefined') return;

  const VERIFICATION_BASE_URL = 'https://4bimcad.github.io/med/zertifikat.html';

  // ---- Auth Guard + Admin-Check ----
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const { data: myProfile, error: myProfileError } = await supabaseClient
    .from('profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .maybeSingle();

  if (myProfileError || !myProfile || !myProfile.is_admin) {
    document.getElementById('admin-content').classList.add('d-none');
    document.getElementById('admin-denied').classList.remove('d-none');
    return;
  }

  document.getElementById('admin-content').classList.remove('d-none');

  // ---- Elemente ----
  const searchInput = document.getElementById('user-search-input');
  const searchBtn = document.getElementById('user-search-btn');
  const searchResults = document.getElementById('user-search-results');

  const selectedUserPanel = document.getElementById('selected-user-panel');
  const selectedUserName = document.getElementById('selected-user-name');
  const selectedUserEmail = document.getElementById('selected-user-email');

  const courseSelect = document.getElementById('enroll-course-select');
  const pricePaidInput = document.getElementById('enroll-price-paid');
  const enrollBtn = document.getElementById('enroll-btn');
  const enrollAlert = document.getElementById('enroll-alert');

  const enrollmentsList = document.getElementById('enrollments-list');
  const certificatesList = document.getElementById('certificates-list');

  let selectedUser = null;
  let coursesCache = [];

  // ---- Kurse laden für Dropdown ----
  async function loadCourses() {
    const { data, error } = await supabaseClient.from('courses').select('*').order('title');
    if (error) {
      console.error('Kurse konnten nicht geladen werden:', error);
      return;
    }
    coursesCache = data || [];
    courseSelect.innerHTML = '<option value="">Kurs wählen …</option>' +
      coursesCache.map(function (c) {
        return '<option value="' + c.id + '">' + c.title + ' (' + c.hours + ' UE, ' + c.price + ' €)</option>';
      }).join('');
  }

  // ---- Nutzer suchen ----
  async function searchUsers() {
    const query = searchInput.value.trim();
    if (!query) return;

    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id, full_name, email, berufsgruppe')
      .ilike('email', '%' + query + '%')
      .limit(20);

    if (error) {
      console.error('Suche fehlgeschlagen:', error);
      return;
    }

    searchResults.innerHTML = '';
    if (!data.length) {
      searchResults.innerHTML = '<p class="text-600 small mb-0">Keine Nutzer gefunden.</p>';
      return;
    }

    data.forEach(function (u) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'list-group-item list-group-item-action';
      item.innerHTML = '<strong>' + (u.full_name || 'Ohne Namen') + '</strong><br><span class="small text-600">' + u.email + '</span>';
      item.addEventListener('click', function () {
        selectUser(u);
      });
      searchResults.appendChild(item);
    });
  }

  function selectUser(u) {
    selectedUser = u;
    selectedUserPanel.classList.remove('d-none');
    selectedUserName.textContent = u.full_name || 'Ohne Namen';
    selectedUserEmail.textContent = u.email;
    enrollAlert.classList.add('d-none');
    loadUserEnrollmentsAndCertificates();
  }

  // ---- Einschreibungen + Zertifikate des gewählten Nutzers laden ----
  async function loadUserEnrollmentsAndCertificates() {
    const { data: enrollments, error: enrollError } = await supabaseClient
      .from('enrollments')
      .select('id, purchased_at, price_paid, courses(id, title, hours)')
      .eq('user_id', selectedUser.id)
      .order('purchased_at', { ascending: false });

    if (enrollError) {
      console.error(enrollError);
    }

    const { data: certificates, error: certError } = await supabaseClient
      .from('certificates')
      .select('certificate_number, issued_at, courses(title)')
      .eq('user_id', selectedUser.id);

    if (certError) {
      console.error(certError);
    }

    const certifiedCourseIds = new Set();
    // Wir kennen course_id nicht direkt aus obigem Select, daher separat holen:
    const { data: certRows } = await supabaseClient
      .from('certificates')
      .select('course_id')
      .eq('user_id', selectedUser.id);
    (certRows || []).forEach(function (c) { certifiedCourseIds.add(c.course_id); });

    enrollmentsList.innerHTML = '';
    (enrollments || []).forEach(function (e) {
      const course = e.courses;
      const alreadyCertified = certifiedCourseIds.has(course ? course.id : null);

      const row = document.createElement('div');
      row.className = 'd-flex justify-content-between align-items-center border rounded-3 p-3 mb-2';
      row.innerHTML =
        '<div>' +
          '<div class="fw-bold">' + (course ? course.title : '') + '</div>' +
          '<div class="small text-600">' + (course ? course.hours : '') + ' UE · bezahlt: ' + (e.price_paid != null ? e.price_paid + ' €' : '–') + '</div>' +
        '</div>';

      if (alreadyCertified) {
        const badge = document.createElement('span');
        badge.className = 'badge bg-success';
        badge.textContent = 'Zertifikat vorhanden';
        row.appendChild(badge);
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-sm btn-primary rounded-pill';
        btn.textContent = 'Zertifikat erstellen';
        btn.addEventListener('click', function () {
          generateCertificate(course);
        });
        row.appendChild(btn);
      }

      enrollmentsList.appendChild(row);
    });

    if (!enrollments || !enrollments.length) {
      enrollmentsList.innerHTML = '<p class="text-600 small mb-0">Keine Einschreibungen.</p>';
    }

    certificatesList.innerHTML = '';
    (certificates || []).forEach(function (c) {
      const item = document.createElement('div');
      item.className = 'small text-600 mb-1';
      item.textContent = c.certificate_number + ' — ' + (c.courses ? c.courses.title : '') + ' (' + new Date(c.issued_at).toLocaleDateString('de-DE') + ')';
      certificatesList.appendChild(item);
    });
    if (!certificates || !certificates.length) {
      certificatesList.innerHTML = '<p class="text-600 small mb-0">Keine Zertifikate.</p>';
    }
  }

  // ---- Einschreibung anlegen (Zahlung manuell vermerken) ----
  enrollBtn.addEventListener('click', async function () {
    if (!selectedUser) return;
    const courseId = courseSelect.value;
    if (!courseId) {
      showEnrollAlert('Bitte einen Kurs auswählen.', 'danger');
      return;
    }

    const pricePaid = parseFloat(pricePaidInput.value) || null;
    const course = coursesCache.find(function (c) { return c.id === courseId; });

    enrollBtn.disabled = true;
    const { data: newEnrollment, error } = await supabaseClient
      .from('enrollments')
      .insert({
        user_id: selectedUser.id,
        course_id: courseId,
        price_paid: pricePaid
      })
      .select()
      .single();

    if (error) {
      enrollBtn.disabled = false;
      showEnrollAlert('Fehler: ' + error.message, 'danger');
      return;
    }

    // Rechnungs-PDF automatisch erzeugen und im privaten Bucket ablegen
    try {
      const invoicePath = await generateInvoicePdf(newEnrollment, course, pricePaid);
      const { error: updateError } = await supabaseClient
        .from('enrollments')
        .update({ invoice_pdf_path: invoicePath })
        .eq('id', newEnrollment.id);

      if (updateError) {
        console.error('invoice_pdf_path konnte nicht gespeichert werden:', updateError);
      }
    } catch (invoiceErr) {
      console.error('Rechnung konnte nicht erstellt werden:', invoiceErr);
    }

    enrollBtn.disabled = false;
    showEnrollAlert('Einschreibung erfolgreich angelegt.', 'success');
    pricePaidInput.value = '';
    loadUserEnrollmentsAndCertificates();
  });

  // ---- Rechnungs-PDF erzeugen (privates Storage-Bucket "invoices") ----
  async function generateInvoicePdf(enrollment, course, pricePaid) {
    const invoiceNumber = 'RE-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    doc.setFontSize(18);
    doc.text('Rechnung / Zahlungsbeleg', 20, 25);

    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text('FortbildungMed OÜ, Tallinn, Estland', 20, 35);

    doc.setTextColor(20, 20, 20);
    doc.text('Rechnungsnummer: ' + invoiceNumber, 20, 50);
    doc.text('Datum: ' + new Date().toLocaleDateString('de-DE'), 20, 57);
    doc.text('Kunde: ' + (selectedUser.full_name || ''), 20, 64);
    doc.text('E-Mail: ' + selectedUser.email, 20, 71);

    doc.line(20, 80, 190, 80);

    doc.text('Beschreibung', 20, 90);
    doc.text('Betrag', 170, 90);
    doc.text(course.title, 20, 98);
    doc.text((pricePaid != null ? pricePaid.toFixed(2) : '0.00') + ' €', 170, 98);

    doc.line(20, 105, 190, 105);
    doc.setFontSize(13);
    doc.text('Gesamt: ' + (pricePaid != null ? pricePaid.toFixed(2) : '0.00') + ' €', 140, 115);

    const pdfBlob = doc.output('blob');
    const filePath = selectedUser.id + '/' + enrollment.id + '.pdf';

    const { error: uploadError } = await supabaseClient.storage
      .from('invoices')
      .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });

    if (uploadError) throw uploadError;

    return filePath;
  }

  function showEnrollAlert(message, type) {
    enrollAlert.textContent = message;
    enrollAlert.className = 'alert alert-' + type;
    enrollAlert.classList.remove('d-none');
  }

  // ---- Bild-URL in Data-URL umwandeln (nötig für doc.addImage) ----
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

  // ---- Zertifikat generieren: PDF + QR-Code + Upload + DB-Eintrag ----
  async function generateCertificate(course) {
    const hoursInput = prompt('Unterrichtseinheiten (UE) für dieses Zertifikat:', course.hours);
    if (hoursInput === null) return;
    const hours = parseFloat(hoursInput) || course.hours;

    const certificateNumber = 'FM-' + new Date().getFullYear() + '-' + Math.floor(10000 + Math.random() * 90000);
    const verificationUrl = VERIFICATION_BASE_URL + '?nr=' + encodeURIComponent(certificateNumber);

    // QR-Code als Data-URL erzeugen (lokale Bibliothek, kein externes CDN)
    const qr = qrcode(0, 'M');
    qr.addData(verificationUrl);
    qr.make();
    const qrDataUrl = qr.createDataURL(6, 4);

    // Logo laden (Fehler hier dürfen die Zertifikatserstellung nicht blockieren)
    let logoDataUrl = null;
    try {
      logoDataUrl = await loadImageAsDataURL('assets/img/icons/logo.png');
    } catch (e) {
      console.error('Logo konnte nicht geladen werden:', e);
    }

    // PDF erzeugen
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;

    // Dünne Kopfleiste
    doc.setFillColor(156, 105, 226);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Logo oben links (Originalverhältnis 300:79 beibehalten)
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
    doc.text(selectedUser.full_name || 'Teilnehmer/in', pageWidth / 2, 76, { align: 'center' });

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
    doc.text('Kursdauer: ' + hours + ' Unterrichtseinheiten (UE)', pageWidth / 2, 132, { align: 'center' });
    doc.text('Ausgestellt am: ' + new Date().toLocaleDateString('de-DE'), pageWidth / 2, 140, { align: 'center' });

    // QR-Code + Zertifikatsnummer unten rechts
    doc.addImage(qrDataUrl, 'PNG', 250, 155, 30, 30);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Verifizierung', 265, 188, { align: 'center' });
    doc.text(certificateNumber, 265, 192, { align: 'center' });

    const pdfBlob = doc.output('blob');

    // Upload
    const filePath = certificateNumber + '.pdf';
    const { error: uploadError } = await supabaseClient.storage
      .from('certificates')
      .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      alert('Fehler beim Hochladen des PDFs: ' + uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabaseClient.storage.from('certificates').getPublicUrl(filePath);

    // DB-Eintrag
    const { error: insertError } = await supabaseClient
      .from('certificates')
      .insert({
        certificate_number: certificateNumber,
        user_id: selectedUser.id,
        course_id: course.id,
        full_name_snapshot: selectedUser.full_name || '',
        hours: hours,
        pdf_url: publicUrlData.publicUrl
      });

    if (insertError) {
      alert('PDF hochgeladen, aber Datenbankeintrag fehlgeschlagen: ' + insertError.message);
      return;
    }

    alert('Zertifikat ' + certificateNumber + ' erfolgreich erstellt.');
    loadUserEnrollmentsAndCertificates();
  }

  searchBtn.addEventListener('click', searchUsers);
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') searchUsers();
  });

  await loadCourses();
})();
