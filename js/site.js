/* ============================================================
   Arch City Property Care — shared site JS
   - Mobile nav toggle
   - Active nav link highlight
   - Quote form submit -> Apps Script (AR Lead Collector v1)
   ============================================================ */
(function () {
  'use strict';

  /* ---- Mobile nav toggle ---- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---- Active nav link ---- */
  var path = location.pathname.replace(/\/index\.html$/, '/');
  document.querySelectorAll('.site-nav a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || a.classList.contains('nav-cta')) return;
    var norm = href.replace(/\/index\.html$/, '/');
    if (norm === path || (norm !== '/' && path.indexOf(norm) === 0)) {
      a.classList.add('active');
    }
  });

  /* ---- Prefill service from ?service= (used by "join the list" CTAs) ---- */
  var params = new URLSearchParams(location.search);
  var presetService = params.get('service');
  var serviceField = document.getElementById('q-service');
  if (presetService && serviceField) {
    serviceField.value = presetService;
  }

  /* ---- Quote form ----
     LOCKED 7-field schema POSTs to the live AR Lead Collector v1 /exec.
     The collector accepts URL params (no-cors), proven from the
     coming-soon site. Field names below map to the lead sheet columns.
     TODO: confirm param names against the 13-column sheet headers if a
     column ever lands blank after a real submission. */
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzy1St_hJ0tOeEp2D5hCYFwPlg7jpx0pdB0o7SSUTuzQTPvzMuuukcT_iJWOeyctBI/exec';

  var form = document.getElementById('quoteForm');
  if (!form) return;

  var successBox = document.getElementById('quoteSuccess');
  var errorBox = document.getElementById('quoteError');

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
    setTimeout(function () { errorBox.style.display = 'none'; }, 5000);
  }

  var emailRe = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var data = {
      name:     (form.elements['name'].value || '').trim(),
      phone:    (form.elements['phone'].value || '').trim(),
      email:    (form.elements['email'].value || '').trim(),
      service:  (form.elements['service'].value || '').trim(),
      location: (form.elements['location'].value || '').trim(),
      notes:    (form.elements['notes'].value || '').trim(),
      contact:  (form.elements['contact'].value || '').trim()
    };

    if (!data.name)    { showError('Please enter your name.'); return; }
    if (!data.phone)   { showError('Please enter a phone number.'); return; }
    if (!emailRe.test(data.email)) { showError('Please enter a valid email (e.g. name@domain.com).'); return; }
    if (!data.service) { showError('Please tell us what service you need.'); return; }
    if (!data.location){ showError('Please enter your job location or zip.'); return; }
    if (!data.contact) { showError('Please choose a preferred contact method.'); return; }

    var btn = form.querySelector('.form-submit');
    var origText = btn ? btn.textContent : '';
    if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }

    var qs = new URLSearchParams({
      name:    data.name,
      phone:   data.phone,
      email:   data.email,
      service: data.service,
      location: data.location,
      notes:   data.notes,
      contact: data.contact,
      venture: 'Arch City Property Care',
      source:  location.hostname || 'archcitypropertycare.com'
    });

    fetch(ENDPOINT + '?' + qs.toString(), { method: 'GET', mode: 'no-cors' })
      .then(finish)
      .catch(finish);

    // no-cors gives an opaque response we can't read; treat the request as sent.
    function finish() {
      form.style.display = 'none';
      if (successBox) successBox.style.display = 'block';
      if (successBox && successBox.scrollIntoView) {
        successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  });
})();
