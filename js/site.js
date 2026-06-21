/* ============================================================
   Arch City Property Care — shared site JS
   - Mobile nav toggle + active-link highlight
   - Lead capture for the Quote form and the Lawn Waitlist form
     -> Supabase Edge Function `capture-lead` (live backend; do NOT rebuild)
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- Active nav link ---------- */
  var path = location.pathname.replace(/\/index\.html$/, '/');
  document.querySelectorAll('.site-nav a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || a.classList.contains('nav-cta')) return;
    var norm = href.replace(/\/index\.html$/, '/');
    if (norm === path) a.classList.add('active');
  });

  /* ---------- Prefill service_wanted from ?service= (quote CTAs) ---------- */
  var presetService = new URLSearchParams(location.search).get('service');
  var serviceField = document.getElementById('q-service');
  if (presetService && serviceField && !serviceField.value) serviceField.value = presetService;

  /* ============================================================
     LEAD CAPTURE
     Endpoint (no auth, no key in the front-end, ever):
       POST https://bgswqjgswlvdazseyhvu.supabase.co/functions/v1/capture-lead
       Content-Type: application/json
     Hardcoded identity (preserve exactly): entity + dba.
     Success contract: ONLY { "ok": true }.
     Failure contract: { "ok": false, "error": "<code>" } — never echo the
     server text; show the generic line and log the code to console only.
     ============================================================ */
  var ENDPOINT = 'https://bgswqjgswlvdazseyhvu.supabase.co/functions/v1/capture-lead';
  var ENTITY = 'CBUS';
  var DBA = 'Arch City Property Care';

  /* ⚠️ CONSENT_TEXT IS A PLACEHOLDER pending attorney review (exact wording
     + Ohio CSPA timing). This is NOT final legal copy — do not treat as
     approved. Sent verbatim with every submission as `consent_text`. */
  var CONSENT_TEXT = 'I agree to receive calls and text messages from Arch City Property Care about my request. Msg & data rates may apply. Msg frequency varies. Reply STOP to opt out, HELP for help. Consent is not a condition of service.';

  var GENERIC_ERR = 'Something went wrong — please call or text us at (380) 261-2194';
  var emailRe = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

  function val(form, name) {
    var el = form.elements[name];
    return el ? (el.value || '').trim() : '';
  }

  function showError(form, msg) {
    var box = form.querySelector('.form-error');
    if (!box) return;
    box.textContent = msg;
    box.style.display = 'block';
  }
  function clearError(form) {
    var box = form.querySelector('.form-error');
    if (box) box.style.display = 'none';
  }

  function succeed(form) {
    var success = form.parentNode.querySelector('.form-success');
    form.reset();
    form.style.display = 'none';
    if (success) {
      success.style.display = 'block';
      if (success.scrollIntoView) success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function send(form, payload, btn, origLabel) {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'bad_json' }; }); })
      .then(function (res) {
        if (res && res.ok === true) {
          succeed(form);
        } else {
          // never surface server text to the user; log the code only
          console.error('capture-lead failed:', (res && res.error) || 'unknown');
          showError(form, GENERIC_ERR);
          if (btn) { btn.disabled = false; btn.textContent = origLabel; }
        }
      })
      .catch(function (err) {
        console.error('capture-lead network error:', err && err.message);
        showError(form, GENERIC_ERR);
        if (btn) { btn.disabled = false; btn.textContent = origLabel; }
      });
  }

  /* ---------- Quote form ---------- */
  var quoteForm = document.getElementById('quoteForm');
  if (quoteForm) {
    quoteForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError(quoteForm);

      var name = val(quoteForm, 'name');
      var phone = val(quoteForm, 'phone');
      var email = val(quoteForm, 'email');

      if (!name) { showError(quoteForm, 'Please enter your name.'); return; }
      if (!phone && !email) { showError(quoteForm, 'Please enter a phone number or an email so we can reach you.'); return; }
      if (email && !emailRe.test(email)) { showError(quoteForm, 'Please enter a valid email (e.g. name@domain.com).'); return; }

      // Honeypot: if a bot filled the hidden field, fake success and never send.
      if (val(quoteForm, '_hp')) { succeed(quoteForm); return; }

      var consentEl = quoteForm.elements['consent_sms'];
      var payload = {
        entity: ENTITY,                              // hardcoded — preserve exactly
        dba: DBA,                                     // hardcoded — preserve exactly
        source: quoteForm.getAttribute('data-source') || 'web:quote', // per-page source (web:<slug>)
        name: name,
        consent_sms: !!(consentEl && consentEl.checked),
        consent_text: CONSENT_TEXT,
        _hp: ''                                       // honeypot — preserve
      };
      if (phone) payload.phone = phone;
      if (email) payload.email = email;
      var service = val(quoteForm, 'service_wanted'); if (service) payload.service_wanted = service;
      var location = val(quoteForm, 'location'); if (location) payload.location = location;
      var notes = val(quoteForm, 'notes'); if (notes) payload.notes = notes;
      var pc = val(quoteForm, 'preferred_contact'); if (pc) payload.preferred_contact = pc;

      var btn = quoteForm.querySelector('.form-submit');
      var origLabel = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      send(quoteForm, payload, btn, origLabel);
    });
  }

  /* ---------- Lawn Waitlist form ---------- */
  var waitForm = document.getElementById('waitlistForm');
  if (waitForm) {
    waitForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearError(waitForm);

      var name = val(waitForm, 'name');
      var phone = val(waitForm, 'phone');
      var email = val(waitForm, 'email');
      var zip = val(waitForm, 'zip');

      if (!name) { showError(waitForm, 'Please enter your name.'); return; }
      if (!phone && !email) { showError(waitForm, 'Please enter a phone number or an email so we can reach you.'); return; }
      if (email && !emailRe.test(email)) { showError(waitForm, 'Please enter a valid email (e.g. name@domain.com).'); return; }
      if (!/^\d{5}$/.test(zip)) { showError(waitForm, 'Please enter your 5-digit ZIP code so we can place you on the right route.'); return; }

      if (val(waitForm, '_hp')) { succeed(waitForm); return; }

      var consentEl = waitForm.elements['consent_sms'];
      var payload = {
        entity: ENTITY,                              // hardcoded — preserve exactly
        dba: DBA,                                     // hardcoded — preserve exactly
        source: waitForm.getAttribute('data-source') || 'web:waitlist', // per-page source (web:<slug>)
        service_wanted: 'Recurring Mowing (Waitlist)', // preserve exactly
        name: name,
        location: zip,                                // ZIP sent in BOTH location...
        zip: zip,                                      // ...and zip
        consent_sms: !!(consentEl && consentEl.checked),
        consent_text: CONSENT_TEXT,
        _hp: ''                                       // honeypot — preserve
      };
      if (phone) payload.phone = phone;
      if (email) payload.email = email;

      var btn = waitForm.querySelector('.form-submit');
      var origLabel = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      send(waitForm, payload, btn, origLabel);
    });
  }
})();
