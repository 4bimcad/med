// Mein Konto — lädt echte Daten aus Supabase und verdrahtet alle Formulare.

(async function () {
  if (typeof supabaseClient === 'undefined') return;

  // ---- Auth Guard: ohne Sitzung zurück zum Login ----
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }
  const user = session.user;

  // ---- Elemente ----
  const avatarEl = document.getElementById('account-avatar');
  const nameEl = document.getElementById('account-name');
  const emailEl = document.getElementById('account-email');

  const settingsAlert = document.getElementById('settings-alert');
  const fullNameInput = document.getElementById('settings-full-name');
  const berufInput = document.getElementById('settings-beruf');
  const emailInput = document.getElementById('settings-email');
  const linkedinInput = document.getElementById('settings-linkedin');
  const profileForm = document.getElementById('profile-form');

  const cvForm = document.getElementById('cv-form');
  const cvFileInput = document.getElementById('cv-file');
  const cvCurrentLink = document.getElementById('cv-current-link');
  const cvAlert = document.getElementById('cv-alert');

  const passwordForm = document.getElementById('password-form');
  const passwordAlert = document.getElementById('password-alert');

  const coursesContainer = document.getElementById('courses-container');
  const coursesEmpty = document.getElementById('courses-empty');
  const certificatesContainer = document.getElementById('certificates-container');
  const certificatesEmpty = document.getElementById('certificates-empty');
  const invoicesBody = document.getElementById('invoices-body');
  const invoicesEmpty = document.getElementById('invoices-empty');

  function showAlert(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.className = 'alert alert-' + type;
    el.classList.remove('d-none');
  }

  function getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(function (p) { return p[0].toUpperCase(); })
      .join('');
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('de-DE');
  }

  // ---- Profil laden ----
  async function loadProfile() {
    const { data: profile, error } = await supabaseClient
      .from('profiles')
      .select('full_name, berufsgruppe, linkedin_url, cv_url')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Profil konnte nicht geladen werden:', error);
    }

    const fullName = (profile && profile.full_name) || user.user_metadata?.full_name || '';
    const beruf = (profile && profile.berufsgruppe) || user.user_metadata?.berufsgruppe || '';
    const linkedin = (profile && profile.linkedin_url) || '';
    const cvUrl = (profile && profile.cv_url) || '';

    if (avatarEl) avatarEl.textContent = getInitials(fullName);
    if (nameEl) nameEl.textContent = fullName || 'Unbekannt';
    if (emailEl) emailEl.textContent = user.email;

    if (fullNameInput) fullNameInput.value = fullName;
    if (berufInput) berufInput.value = beruf;
    if (emailInput) emailInput.value = user.email;
    if (linkedinInput) linkedinInput.value = linkedin;

    if (cvCurrentLink) {
      if (cvUrl) {
        cvCurrentLink.href = cvUrl;
        cvCurrentLink.classList.remove('d-none');
      } else {
        cvCurrentLink.classList.add('d-none');
      }
    }
  }

  // ---- Kurse + Zertifikate laden ----
  async function loadCourses() {
    const { data, error } = await supabaseClient
      .from('enrollments')
      .select('id, purchased_at, price_paid, invoice_pdf_path, courses(id, title, hours, slug)')
      .eq('user_id', user.id)
      .order('purchased_at', { ascending: false });

    if (error) {
      console.error('Kurse konnten nicht geladen werden:', error);
      return [];
    }
    return data || [];
  }

  async function loadCertificates() {
    const { data, error } = await supabaseClient
      .from('certificates')
      .select('certificate_number, issued_at, hours, pdf_url, courses(title)')
      .eq('user_id', user.id)
      .order('issued_at', { ascending: false });

    if (error) {
      console.error('Zertifikate konnten nicht geladen werden:', error);
      return [];
    }
    return data || [];
  }

  function renderCourses(enrollments) {
    if (!coursesContainer) return;
    coursesContainer.innerHTML = '';

    if (!enrollments.length) {
      if (coursesEmpty) coursesEmpty.classList.remove('d-none');
      return;
    }
    if (coursesEmpty) coursesEmpty.classList.add('d-none');

    enrollments.forEach(function (e) {
      const course = e.courses;
      if (!course) return;

      const card = document.createElement('div');
      card.className = 'course-card-account p-3 p-md-4 mb-3';
      card.innerHTML =
        '<div class="row align-items-center g-3">' +
          '<div class="col-auto">' +
            '<div class="rounded-3 d-flex align-items-center justify-content-center" style="width:56px;height:56px;background:#f3e8ff;">' +
              '<i class="bi bi-journal-bookmark" style="font-size:1.5rem;color:#9C69E2;"></i>' +
            '</div>' +
          '</div>' +
          '<div class="col">' +
            '<div class="d-flex flex-wrap align-items-center gap-2 mb-1">' +
              '<h5 class="fw-bold mb-0 fs-6">' + course.title + '</h5>' +
            '</div>' +
            '<div class="small text-600">' + course.hours + ' UE · Gekauft am ' + formatDate(e.purchased_at) + '</div>' +
          '</div>' +
        '</div>';
      coursesContainer.appendChild(card);
    });
  }

  function renderCertificates(certs) {
    if (!certificatesContainer) return;
    certificatesContainer.innerHTML = '';

    if (!certs.length) {
      if (certificatesEmpty) certificatesEmpty.classList.remove('d-none');
      return;
    }
    if (certificatesEmpty) certificatesEmpty.classList.add('d-none');

    certs.forEach(function (c) {
      const course = c.courses;
      const card = document.createElement('div');
      card.className = 'course-card-account p-3 p-md-4 mb-3';

      const downloadBtn = c.pdf_url
        ? '<a href="' + c.pdf_url + '" target="_blank" class="btn btn-sm btn-primary rounded-pill px-3"><i class="bi bi-download me-1"></i>PDF herunterladen</a>'
        : '<span class="badge bg-light text-600 border">PDF wird vorbereitet</span>';

      card.innerHTML =
        '<div class="row align-items-center g-3">' +
          '<div class="col-auto"><i class="bi bi-award" style="font-size:2rem;color:#9C69E2;"></i></div>' +
          '<div class="col">' +
            '<h5 class="fw-bold mb-1 fs-6">' + (course ? course.title : 'Kurs') + '</h5>' +
            '<div class="small text-600">Ausgestellt am ' + formatDate(c.issued_at) + ' · ' + c.hours + ' UE · Nr. ' + c.certificate_number + '</div>' +
          '</div>' +
          '<div class="col-auto">' + downloadBtn + '</div>' +
        '</div>';
      certificatesContainer.appendChild(card);
    });
  }

  async function renderInvoices(enrollments) {
    if (!invoicesBody) return;
    invoicesBody.innerHTML = '';

    if (!enrollments.length) {
      if (invoicesEmpty) invoicesEmpty.classList.remove('d-none');
      return;
    }
    if (invoicesEmpty) invoicesEmpty.classList.add('d-none');

    for (const e of enrollments) {
      const course = e.courses;
      let actionHtml = '<span class="badge bg-light text-600 border">Rechnung folgt</span>';

      if (e.invoice_pdf_path) {
        const { data: signedData } = await supabaseClient.storage
          .from('invoices')
          .createSignedUrl(e.invoice_pdf_path, 3600);

        if (signedData && signedData.signedUrl) {
          actionHtml = '<a href="' + signedData.signedUrl + '" target="_blank" class="btn btn-sm btn-outline-secondary rounded-pill">PDF</a>';
        }
      }

      const row = document.createElement('tr');
      row.innerHTML =
        '<td class="small">' + formatDate(e.purchased_at) + '</td>' +
        '<td>' + (course ? course.title : '') + '</td>' +
        '<td class="fw-bold">' + (e.price_paid != null ? e.price_paid.toFixed(2) + ' €' : '–') + '</td>' +
        '<td class="text-end">' + actionHtml + '</td>';
      invoicesBody.appendChild(row);
    }
  }

  // ---- Profil speichern ----
  if (profileForm) {
    profileForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = profileForm.querySelector('button[type="submit"]');
      btn.disabled = true;

      const { error } = await supabaseClient
        .from('profiles')
        .update({
          full_name: fullNameInput.value.trim(),
          berufsgruppe: berufInput.value.trim(),
          linkedin_url: linkedinInput.value.trim() || null
        })
        .eq('id', user.id);

      btn.disabled = false;

      if (error) {
        showAlert(settingsAlert, 'Fehler beim Speichern: ' + error.message, 'danger');
      } else {
        showAlert(settingsAlert, 'Daten erfolgreich gespeichert.', 'success');
        nameEl.textContent = fullNameInput.value.trim();
        avatarEl.textContent = getInitials(fullNameInput.value.trim());
      }
    });
  }

  // ---- CV hochladen ----
  if (cvForm) {
    cvForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const file = cvFileInput.files[0];
      if (!file) {
        showAlert(cvAlert, 'Bitte wählen Sie eine PDF-Datei aus.', 'danger');
        return;
      }
      if (file.type !== 'application/pdf') {
        showAlert(cvAlert, 'Bitte nur PDF-Dateien hochladen.', 'danger');
        return;
      }

      const btn = cvForm.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Wird hochgeladen …';

      const filePath = user.id + '/cv.pdf';

      const { error: uploadError } = await supabaseClient.storage
        .from('cvs')
        .upload(filePath, file, { upsert: true, contentType: 'application/pdf' });

      if (uploadError) {
        btn.disabled = false;
        btn.textContent = 'CV hochladen';
        showAlert(cvAlert, 'Fehler beim Hochladen: ' + uploadError.message, 'danger');
        return;
      }

      const { data: publicUrlData } = supabaseClient.storage.from('cvs').getPublicUrl(filePath);
      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ cv_url: publicUrl })
        .eq('id', user.id);

      btn.disabled = false;
      btn.textContent = 'CV hochladen';

      if (updateError) {
        showAlert(cvAlert, 'CV hochgeladen, aber Profil konnte nicht aktualisiert werden: ' + updateError.message, 'danger');
        return;
      }

      showAlert(cvAlert, 'CV erfolgreich hochgeladen.', 'success');
      cvCurrentLink.href = publicUrl;
      cvCurrentLink.classList.remove('d-none');
    });
  }

  // ---- Passwort ändern ----
  if (passwordForm) {
    passwordForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const newPasswordRepeat = document.getElementById('new-password-repeat').value;

      if (!currentPassword || !newPassword) {
        showAlert(passwordAlert, 'Bitte alle Felder ausfüllen.', 'danger');
        return;
      }
      if (newPassword.length < 8) {
        showAlert(passwordAlert, 'Das neue Passwort muss mindestens 8 Zeichen lang sein.', 'danger');
        return;
      }
      if (newPassword !== newPasswordRepeat) {
        showAlert(passwordAlert, 'Die neuen Passwörter stimmen nicht überein.', 'danger');
        return;
      }

      const btn = passwordForm.querySelector('button[type="submit"]');
      btn.disabled = true;

      // Aktuelles Passwort verifizieren, indem wir uns damit erneut anmelden
      const { error: reauthError } = await supabaseClient.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });

      if (reauthError) {
        btn.disabled = false;
        showAlert(passwordAlert, 'Das aktuelle Passwort ist falsch.', 'danger');
        return;
      }

      const { error: updateError } = await supabaseClient.auth.updateUser({ password: newPassword });

      btn.disabled = false;

      if (updateError) {
        showAlert(passwordAlert, 'Fehler: ' + updateError.message, 'danger');
        return;
      }

      showAlert(passwordAlert, 'Passwort erfolgreich geändert.', 'success');
      passwordForm.reset();
    });
  }

  // ---- Abmelden-Link in der Sidebar ----
  const logoutLink = document.getElementById('sidebar-logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', async function (e) {
      e.preventDefault();
      await supabaseClient.auth.signOut();
      window.location.href = 'index.html';
    });
  }

  // ---- Alles laden ----
  await loadProfile();
  const enrollments = await loadCourses();
  renderCourses(enrollments);
  await renderInvoices(enrollments);
  const certs = await loadCertificates();
  renderCertificates(certs);
})();
