/* Browser UI adapter, scoped to the existing installed icon. */
(() => {
  'use strict';
  if (!window.createDotappUpdater || !window.DOTAPP_RELEASE) return;
  const config = window.DOTAPP_RELEASE, base = new URL('.', document.baseURI).href;
  let dirty = false, composing = false, panel, latest, confirmed = false;
  const blocked = () => dirty || composing || document.visibilityState === 'hidden' || !!document.querySelector('#dotapp-transfer-v2, [data-dotapp-update-busy="true"]');
  const safe = () => !blocked();
  function workerRelease(worker) {
    return new Promise(resolve => {
      if (!worker) return resolve(null);
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); resolve(null); }, 2500);
      channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data?.release || null); };
      worker.postMessage({type:'DOTAPP_VERSION'}, [channel.port2]);
    });
  }
  function remove() { panel?.remove(); panel = null; }
  function paint(state) {
    latest = state;
    document.querySelectorAll('[data-dotapp-update-status]').forEach(node => { node.textContent = state.problem || (state.available ? (state.safe ? 'È disponibile un aggiornamento di dōtapp' : 'L’aggiornamento è rimandato per proteggere le modifiche in corso.') : 'dōtapp è aggiornata'); });
    if (state.phase === 'updated' && !confirmed) { confirmed = true; const toast = document.createElement('div'); toast.setAttribute('role','status'); toast.textContent = 'dōtapp è aggiornata'; toast.style.cssText = 'position:fixed;bottom:110px;left:20px;right:20px;z-index:1000000;background:#60476b;color:white;padding:16px;border-radius:14px;font:16px system-ui;text-align:center'; document.body.append(toast); setTimeout(() => toast.remove(), 5000); }
    if (!state.available || state.deferred || !state.safe || state.reloaded) { remove(); return; }
    if (!panel) {
      panel = document.createElement('div'); panel.id = 'dotapp-update-notice'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-labelledby','dotapp-update-title');
      panel.style.cssText = 'position:fixed;bottom:calc(96px + env(safe-area-inset-bottom));left:16px;right:16px;max-width:440px;margin:auto;z-index:1000001;background:#fff;color:#302637;border:1px solid #dacbdf;border-radius:18px;padding:20px;box-shadow:0 10px 40px #20102740;font:16px/1.4 system-ui';
      panel.innerHTML = '<strong id="dotapp-update-title">È disponibile un aggiornamento di dōtapp</strong><p style="margin:10px 0 16px">Puoi aggiornare senza perdere i tuoi dati.</p><p data-error role="status"></p><div style="display:flex;gap:10px;flex-wrap:wrap"><button data-update>AGGIORNA ORA</button><button data-later>PIÙ TARDI</button></div>';
      panel.querySelectorAll('button').forEach((button, i) => { button.type = 'button'; button.style.cssText = `min-height:46px;padding:10px 14px;border:1px solid #6e5578;border-radius:10px;font:700 14px system-ui;background:${i ? 'white' : '#6e5578'};color:${i ? '#6e5578' : 'white'}`; });
      panel.querySelector('[data-update]').onclick = () => updater.apply(); panel.querySelector('[data-later]').onclick = () => updater.postpone(); document.body.append(panel);
    }
    panel.querySelector('[data-update]').disabled = state.busy; panel.querySelector('[data-update]').textContent = state.busy ? 'AGGIORNAMENTO…' : 'AGGIORNA ORA'; panel.querySelector('[data-error]').textContent = state.problem;
  }
  const updater = createDotappUpdater({release: config.release, base, sw: navigator.serviceWorker, fetch: async (url, options) => {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
    try { return await fetch(url, {...options, signal: controller.signal}); } finally { clearTimeout(timer); }
  }, session: sessionStorage, isSafe: safe, now: Date.now, reload: () => location.reload(), notify: paint, later: setTimeout, cancel: clearTimeout, workerRelease});
  // Canvas Flutter cannot expose every form lifecycle to a DOM adapter. Conservatively
  // defer after any app interaction; only an explicit app safe point or a new page clears it.
  document.addEventListener('pointerdown', event => { if (event.target.closest?.('flt-glass-pane, flt-semantics-host')) { dirty = true; updater.safePoint(); } }, true);
  document.addEventListener('input', event => { if (!event.target.closest?.('#dotapp-update-notice')) { dirty = true; updater.safePoint(); } }, true);
  document.addEventListener('change', event => { if (!event.target.closest?.('#dotapp-update-notice')) { dirty = true; updater.safePoint(); } }, true);
  document.addEventListener('compositionstart', () => { composing = true; updater.safePoint(); }, true);
  document.addEventListener('compositionend', () => { composing = false; updater.safePoint(); }, true);
  window.addEventListener('dotapp-update-safe-point', () => { dirty = false; updater.safePoint(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updater.resume(); else updater.safePoint(); });
  window.addEventListener('pageshow', () => updater.resume()); window.addEventListener('focus', () => updater.resume());
  function mountSettings(shade) {
    if (shade.querySelector('[data-dotapp-version]')) return;
    const section = document.createElement('section'); section.setAttribute('data-dotapp-version',''); section.style.cssText = 'border-top:1px solid #e8dfeb;margin-top:18px;padding-top:16px';
    const label = document.createElement('p'); label.textContent = 'Versione dōtapp: ' + config.release; section.append(label);
    const button = document.createElement('button'); button.type = 'button'; button.textContent = 'CONTROLLA AGGIORNAMENTI'; button.style.cssText = 'font:inherit;font-weight:600;min-height:46px;border:1px solid #d8c9de;background:white;color:#60476b;border-radius:10px;padding:10px;width:100%';
    const status = document.createElement('p'); status.setAttribute('data-dotapp-update-status',''); status.setAttribute('role','status');
    button.onclick = async () => { button.disabled = true; status.textContent = 'Controllo in corso…'; await updater.check(true); button.disabled = false; };
    section.append(button,status); shade.querySelector('[data-app-info]')?.before(section); paint(latest || updater.state());
  }
  window.dotappUpdates = Object.freeze({...updater, mountSettings});
  updater.start();
})();
