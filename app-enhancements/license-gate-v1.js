(() => {
  'use strict';
  const STORAGE_DEVICE = 'scorta_device_v1';
  const STORAGE_LICENSE = 'scorta_license_v1';
  const PUBLIC_KEY = {
    kty: 'EC', crv: 'P-256',
    x: 'Xa0H5ejudFOzEo6gqBxWOSJw6nclum_AgreusvTe1QI',
    y: '8xc9EzI8GqOtzEqBID-Ux9mkGIyIwMG4043jHxOJbBM',
    ext: true
  };
  const enc = new TextEncoder();
  const normalizeDevice = (v) => (v || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const formatDevice = (v) => normalizeDevice(v).match(/.{1,4}/g)?.join('-') || v;
  const b64urlToBytes = (value) => {
    let s = value.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const raw = atob(s);
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  };
  const getDevice = () => {
    let value = normalizeDevice(localStorage.getItem(STORAGE_DEVICE));
    if (value.length >= 16) return value;
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    value = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    localStorage.setItem(STORAGE_DEVICE, value);
    return value;
  };
  const verifyLicense = async (license, device) => {
    try {
      const parts = (license || '').trim().split('.');
      if (parts.length !== 3 || parts[0] !== 'SC1') return false;
      const licenseId = parts[1].trim().toUpperCase();
      if (!/^[A-Z0-9_-]{6,40}$/.test(licenseId)) return false;
      const key = await crypto.subtle.importKey('jwk', PUBLIC_KEY, { name:'ECDSA', namedCurve:'P-256' }, false, ['verify']);
      return await crypto.subtle.verify(
        { name:'ECDSA', hash:'SHA-256' }, key, b64urlToBytes(parts[2]),
        enc.encode('SCORTA1|' + normalizeDevice(device) + '|' + licenseId)
      );
    } catch (_) { return false; }
  };
  const loadApp = () => {
    const flutter = document.createElement('script');
    flutter.src = 'flutter_bootstrap.js';
    flutter.async = true;
    document.body.appendChild(flutter);
  };
  const renderGate = (device) => {
    document.body.innerHTML = `
      <div id="licenseGate" style="min-height:100vh;background:#f7f5f7;color:#2d2630;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;display:flex;align-items:center;justify-content:center;padding:22px">
        <div style="width:min(100%,430px);background:#fff;border:1px solid #e9e4ea;border-radius:28px;padding:26px;box-shadow:0 18px 50px rgba(65,44,70,.12)">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:22px">
            <img src="icons/Icon-192.png" alt="" style="width:64px;height:64px;border-radius:18px;display:block">
            <div><div style="font-size:25px;font-weight:900">Scorta doTERRA</div><div style="font-size:13px;color:#766f79;margin-top:3px">Attivazione personale</div></div>
          </div>
          <div style="font-size:18px;font-weight:850;margin-bottom:8px">Attiva questo dispositivo</div>
          <div style="font-size:14px;line-height:1.55;color:#766f79;margin-bottom:18px">Invia questo codice per ricevere la tua chiave personale. La chiave funzionerà solo su questo dispositivo.</div>
          <div style="background:#f2edf4;border-radius:18px;padding:15px;margin-bottom:12px">
            <div style="font-size:11px;font-weight:800;color:#806b89;text-transform:uppercase;letter-spacing:.7px">Codice dispositivo</div>
            <div id="deviceCode" style="font-size:20px;font-weight:900;letter-spacing:1px;margin-top:5px;word-break:break-word">${formatDevice(device)}</div>
          </div>
          <button id="copyDevice" type="button" style="width:100%;border:1px solid #d9cfdd;background:#fff;color:#6e5578;border-radius:15px;padding:13px;font-size:14px;font-weight:850;margin-bottom:20px">Copia codice dispositivo</button>
          <label for="licenseInput" style="display:block;font-size:12px;font-weight:850;margin-bottom:7px">CHIAVE DI ATTIVAZIONE</label>
          <input id="licenseInput" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="SC1.……" style="width:100%;border:1px solid #d9cfdd;border-radius:15px;padding:15px;font-size:14px;outline:none;margin-bottom:11px">
          <div id="licenseError" style="display:none;color:#a33c45;background:#fff0f1;border-radius:13px;padding:10px 12px;font-size:13px;margin-bottom:11px">Chiave non valida per questo dispositivo.</div>
          <button id="activateLicense" type="button" style="width:100%;border:0;background:#6e5578;color:#fff;border-radius:16px;padding:15px;font-size:15px;font-weight:900">Attiva Scorta doTERRA</button>
          <div style="font-size:11px;color:#928a94;line-height:1.45;margin-top:16px;text-align:center">La chiave viene richiesta solo alla prima attivazione su questo dispositivo.</div>
        </div>
      </div>`;
    const copy = document.getElementById('copyDevice');
    copy.onclick = async () => {
      try {
        await navigator.clipboard.writeText(formatDevice(device));
        copy.textContent = 'Codice copiato ✓';
        setTimeout(() => copy.textContent = 'Copia codice dispositivo', 1500);
      } catch (_) {}
    };
    document.getElementById('activateLicense').onclick = async () => {
      const input = document.getElementById('licenseInput');
      const error = document.getElementById('licenseError');
      const button = document.getElementById('activateLicense');
      error.style.display = 'none'; button.disabled = true; button.textContent = 'Verifica…';
      const license = input.value.trim();
      if (await verifyLicense(license, device)) {
        localStorage.setItem(STORAGE_LICENSE, license);
        location.reload(); return;
      }
      error.style.display = 'block'; button.disabled = false; button.textContent = 'Attiva Scorta doTERRA';
    };
  };
  const start = async () => {
    const device = getDevice();
    const saved = localStorage.getItem(STORAGE_LICENSE);
    if (saved && await verifyLicense(saved, device)) { loadApp(); return; }
    if (saved) localStorage.removeItem(STORAGE_LICENSE);
    renderGate(device);
  };
  start();
})();
