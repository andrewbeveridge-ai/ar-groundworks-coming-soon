/* ============================================================
   Arch City Property Care — shared site JS
   - Mobile nav toggle + active-link highlight
   - Lead capture for the Quote form and the Lawn Waitlist form
     -> Supabase Edge Function `capture-lead` (live backend; do NOT rebuild)
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Mobile nav toggle (with focus trap + return) ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    function navLinks() { return Array.prototype.slice.call(nav.querySelectorAll('a')); }
    function setNav(open) {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { var l = navLinks(); if (l[0]) l[0].focus(); }
    }
    toggle.addEventListener('click', function () {
      setNav(!nav.classList.contains('open'));
    });
    // Only active while the mobile menu is open; desktop nav never has .open
    document.addEventListener('keydown', function (e) {
      if (!nav.classList.contains('open')) return;
      if (e.key === 'Escape') { setNav(false); toggle.focus(); return; }
      if (e.key === 'Tab') {
        var l = navLinks(); if (!l.length) return;
        var first = l[0], last = l[l.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); toggle.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); toggle.focus(); }
      }
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

  /* ---------- Service chips: define sync + prefill from ?service= ---------- */
  function syncServiceChips(form){
    var group = form.querySelector('.chip-group');
    var hidden = form.querySelector('input[name="service_wanted"]');
    if(!group || !hidden) return;
    var picked = Array.prototype.map.call(
      group.querySelectorAll('input[type="checkbox"]:checked'), function(c){ return c.value; });
    if (hidden.dataset && hidden.dataset.preset) picked.push(hidden.dataset.preset);
    hidden.value = picked.join(', ');
  }
  (function(){
    var presetService = new URLSearchParams(location.search).get('service');
    if (!presetService) return;
    var hid = document.getElementById('q-service');
    var matched = false;
    document.querySelectorAll('.chip-group input[type="checkbox"]').forEach(function(c){
      if (c.value.toLowerCase() === presetService.toLowerCase()) { c.checked = true; matched = true; }
    });
    if (!matched && hid) hid.dataset.preset = presetService;
  })();

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

  /* Solicitation filter. Conservative on purpose: a real customer should never
     trip it. Blocks only (a) the fictional 555 exchange, which can't reach a real
     person anyway, (b) one unmistakable vendor marker, or (c) two weaker ones. */
  function looksLikeSolicitation(phone, notes, email) {
    var d = (phone || '').replace(/\D/g, '');
    if (d.length === 10 && d.substr(3, 3) === '555') return true;
    var t = ((notes || '') + ' ' + (email || '')).toLowerCase();
    if (!t.trim()) return false;
    var strong = [/\bseo\b/, /whatsapp/, /\bloom\b/, /backlink/, /sorry for the contact form/,
                  /couldn'?t find a better way to reach/, /(first|top) page of google/, /page 1\b/,
                  /google (visibility|ranking|rankings)/, /\b(web|website) (design|redesign|developer|development)\b/];
    for (var i = 0; i < strong.length; i++) { if (strong[i].test(t)) return true; }
    var weak = [/\baudit\b/, /\branking/, /\btraffic\b/, /\bmarketing\b/, /\bagency\b/, /\bfree (audit|consultation|analysis)\b/,
                /\byour (website|site|business listing)\b/, /\bleads? for you\b/, /\bfixed price\b/, /\bscope\b/];
    var hits = 0;
    for (var j = 0; j < weak.length; j++) { if (weak[j].test(t)) hits++; }
    return hits >= 2;
  }

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
    if (success) {
      // Success-message SELECTION only: pick the email vs phone-only variant by
      // READING the email field value (read-only). Does NOT affect the payload or
      // the fetch — those already ran before this. Runs before reset() so the
      // value is still present.
      var emailEl = form.elements['email'];
      var hasEmail = !!(emailEl && emailEl.value && emailEl.value.trim());
      var em = success.querySelector('.fs-email');
      var ph = success.querySelector('.fs-phone');
      if (em) em.style.display = hasEmail ? '' : 'none';
      if (ph) ph.style.display = hasEmail ? 'none' : '';
    }
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
      syncServiceChips(quoteForm);

      var name = val(quoteForm, 'name');
      var phone = val(quoteForm, 'phone');
      var email = val(quoteForm, 'email');

      if (!name) { showError(quoteForm, 'Please enter your name.'); return; }
      if (!phone && !email) { showError(quoteForm, 'Please enter a phone number or an email so we can reach you.'); return; }
      if (email && !emailRe.test(email)) { showError(quoteForm, 'Please enter a valid email (e.g. name@domain.com).'); return; }
      if (phone && phone.replace(/\D/g, '').length !== 10) { showError(quoteForm, 'Please enter a valid 10-digit US phone number.'); return; }
      // Location stays flexible (street / neighborhood / ZIP) but rejects junk like "4322k":
      // accept a 5-digit ZIP, OR text with >= 3 letters. Optional — empty is allowed.
      var locVal = val(quoteForm, 'location');
      if (locVal && !/^\d{5}$/.test(locVal) && (locVal.match(/[a-zA-Z]/g) || []).length < 3) { showError(quoteForm, 'Please enter a valid ZIP code or a street/neighborhood.'); return; }

      // Consent (SMS/A2P) is OPTIONAL — never required to submit; recorded either way.
      var consentEl = quoteForm.elements['consent_sms'];

      // Honeypot: if a bot filled the hidden field, fake success and never send.
      if (val(quoteForm, '_hp')) { succeed(quoteForm); return; }

      // Solicitation filter (added 2026-10-15): vendors pitching SEO / web design
      // through the quote form. Fake success, never sent, logged to console only.
      if (looksLikeSolicitation(phone, val(quoteForm, 'notes'), email)) {
        console.warn('quote form: solicitation filtered, not sent');
        succeed(quoteForm); return;
      }

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
      if (phone && phone.replace(/\D/g, '').length !== 10) { showError(waitForm, 'Please enter a valid 10-digit US phone number.'); return; }
      if (!/^\d{5}$/.test(zip)) { showError(waitForm, 'Please enter your 5-digit ZIP code so we can place you on the right route.'); return; }

      // Consent (SMS/A2P) is OPTIONAL — never required to submit; recorded either way.
      var consentEl = waitForm.elements['consent_sms'];

      if (val(waitForm, '_hp')) { succeed(waitForm); return; }

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
