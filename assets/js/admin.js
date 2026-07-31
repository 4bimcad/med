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

    enrollBtn.disabled = true;
    const { error } = await supabaseClient
      .from('enrollments')
      .insert({
        user_id: selectedUser.id,
        course_id: courseId,
        price_paid: pricePaid
      });
    enrollBtn.disabled = false;

    if (error) {
      showEnrollAlert('Fehler: ' + error.message, 'danger');
      return;
    }

    showEnrollAlert('Einschreibung erfolgreich angelegt.', 'success');
    pricePaidInput.value = '';
    loadUserEnrollmentsAndCertificates();
  });

  function showEnrollAlert(message, type) {
    enrollAlert.textContent = message;
    enrollAlert.className = 'alert alert-' + type;
    enrollAlert.classList.remove('d-none');
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

    // PDF erzeugen
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFillColor(156, 105, 226);
    doc.rect(0, 0, 297, 12, 'F');

    doc.setFontSize(26);
    doc.setTextColor(40, 40, 40);
    doc.text('Teilnahmebescheinigung', 148.5, 45, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('FortbildungMed.de bescheinigt hiermit,', 148.5, 60, { align: 'center' });

    doc.setFontSize(22);
    doc.setTextColor(20, 20, 20);
    doc.text(selectedUser.full_name || 'Teilnehmer/in', 148.5, 75, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text('hat erfolgreich an der Fortbildung teilgenommen:', 148.5, 88, { align: 'center' });

    doc.setFontSize(18);
    doc.setTextColor(124, 58, 237);
    doc.text(course.title, 148.5, 100, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(80, 80, 80);
    doc.text(hours + ' Unterrichtseinheiten (UE)', 148.5, 110, { align: 'center' });
    doc.text('Ausgestellt am: ' + new Date().toLocaleDateString('de-DE'), 148.5, 118, { align: 'center' });
    doc.text('Zertifikatsnummer: ' + certificateNumber, 148.5, 125, { align: 'center' });

    doc.addImage(qrDataUrl, 'PNG', 250, 150, 30, 30);
    doc.setFontSize(8);
    doc.text('Verifizierung', 265, 183, { align: 'center' });

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
