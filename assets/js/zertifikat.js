// Zertifikat prüfen — lädt Zertifikatsdaten anhand der Nummer aus der URL
// (?nr=FM-2026-XXXXX) oder über das manuelle Suchfeld.

(function () {
  if (typeof supabaseClient === 'undefined') return;

  const searchInput = document.getElementById('cert-search-input');
  const searchBtn = document.getElementById('cert-search-btn');

  const loadingEl = document.getElementById('cert-loading');
  const notFoundEl = document.getElementById('cert-not-found');
  const resultEl = document.getElementById('cert-result');

  const courseEl = document.getElementById('cert-course');
  const nameEl = document.getElementById('cert-name');
  const hoursEl = document.getElementById('cert-hours');
  const dateEl = document.getElementById('cert-date');
  const numberEl = document.getElementById('cert-number');

  const downloadBtn = document.getElementById('cert-download-btn');
  const cvBtn = document.getElementById('cert-cv-btn');
  const linkedinBtn = document.getElementById('cert-linkedin-btn');

  function reset() {
    loadingEl.classList.add('d-none');
    notFoundEl.classList.add('d-none');
    resultEl.classList.add('d-none');
    downloadBtn.classList.remove('disabled');
    cvBtn.classList.remove('d-none');
    linkedinBtn.classList.remove('d-none');
  }

  async function lookupCertificate(nr) {
    reset();
    if (!nr) return;

    loadingEl.classList.remove('d-none');

    const { data: cert, error } = await supabaseClient
      .from('certificates')
      .select('certificate_number, full_name_snapshot, hours, issued_at, pdf_url, user_id, courses(title)')
      .eq('certificate_number', nr.trim())
      .maybeSingle();

    loadingEl.classList.add('d-none');

    if (error || !cert) {
      notFoundEl.classList.remove('d-none');
      return;
    }

    courseEl.textContent = cert.courses ? cert.courses.title : '–';
    nameEl.textContent = cert.full_name_snapshot;
    hoursEl.textContent = cert.hours + ' UE';
    dateEl.textContent = new Date(cert.issued_at).toLocaleDateString('de-DE');
    numberEl.textContent = cert.certificate_number;

    if (cert.pdf_url) {
      downloadBtn.href = cert.pdf_url;
    } else {
      downloadBtn.classList.add('disabled');
      downloadBtn.removeAttribute('href');
    }

    // Zusätzliche Angaben aus dem Profil (LinkedIn, CV)
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('linkedin_url, cv_url')
      .eq('id', cert.user_id)
      .maybeSingle();

    if (profile && profile.cv_url) {
      cvBtn.href = profile.cv_url;
    } else {
      cvBtn.classList.add('d-none');
    }

    if (profile && profile.linkedin_url) {
      linkedinBtn.href = profile.linkedin_url;
    } else {
      linkedinBtn.classList.add('d-none');
    }

    resultEl.classList.remove('d-none');
  }

  searchBtn.addEventListener('click', function () {
    lookupCertificate(searchInput.value);
  });
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') lookupCertificate(searchInput.value);
  });

  document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    const nr = params.get('nr');
    if (nr) {
      searchInput.value = nr;
      lookupCertificate(nr);
    }
  });
})();
