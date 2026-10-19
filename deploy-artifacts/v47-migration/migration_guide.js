/* Guided migration UI only. Personal data stays in this origin's storage. */
(() => {
  'use strict';
  const NEW_APP = 'https://do-tapp.it/';
  const DISMISSED = 'dotapp_migration_notice_dismissed_v1';
  const legacy = () => location.origin === 'https://iridea85.github.io' &&
    location.pathname.startsWith('/scorta-doterra-download/app/');
  const current = () => location.origin === 'https://do-tapp.it';
  let hiddenThisVisit = false;
  const buttonStyle = 'font:inherit;font-size:14px;min-height:44px;padding:10px 12px;border:1px solid #d8c9de;border-radius:10px;background:white;color:#60476b;cursor:pointer';
  function element(tag, text, parent) {
    const node = document.createElement(tag); node.textContent = text;
    if (parent) parent.append(node); return node;
  }
  function button(text, parent, action) {
    const node = element('button', text, parent); node.type = 'button';
    node.style.cssText = buttonStyle; node.onclick = action; return node;
  }
  function dismiss() {
    hiddenThisVisit = true;
    try { localStorage.setItem(DISMISSED, '1'); } catch (_) { /* Keep this visit usable. */ }
    document.querySelector('#dotapp-migration-notice')?.remove();
  }
  function showNotice() {
    if (!legacy() || hiddenThisVisit || document.querySelector('#dotapp-migration-notice')) return;
    try { if (localStorage.getItem(DISMISSED) === '1') return; }
    catch (_) { return; }
    const notice = element('aside', '', document.body); notice.id = 'dotapp-migration-notice';
    notice.setAttribute('aria-label', 'Nuovo indirizzo dōtapp');
    notice.style.cssText = 'box-sizing:border-box;position:fixed;left:12px;right:12px;bottom:152px;z-index:99997;margin:auto;max-width:440px;max-height:48dvh;overflow:auto;padding:14px;border:1px solid #d8c9de;border-radius:14px;background:#faf8fb;color:#302637;box-shadow:0 6px 24px #38244322;font:14px/1.45 system-ui';
    element('strong', '🌿 dōtapp ha un nuovo indirizzo', notice);
    element('p', 'Per continuare a usare dōtapp sul nuovo indirizzo mantenendo i tuoi dati, esporta prima il tuo backup e importalo nella nuova app.', notice);
    const actions = element('div', '', notice); actions.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap';
    button('TRASFERISCI I MIEI DATI', actions, () => {
      // Leave the notice available if the existing backup UI has not loaded.
      if (!window.dotappBackup || !window.scortaOpenSettings) return;
      window.scortaOpenSettings(); window.dotappBackup.open(); dismiss();
    });
    button('NON ORA', actions, dismiss);
  }
  function hasPersonalData() {
    try {
      if (localStorage.getItem('dotapp_backup_restore_journal_v1') !== null) return true;
      if (!window.dotappBackup) return true;
      for (const key of window.dotappBackup.KEYS) {
        if (key === 'doterra_app_messages_read_v1') continue;
        const raw = localStorage.getItem('flutter.' + key);
        if (raw === null) continue;
        const stored = JSON.parse(raw);
        const rows = typeof stored === 'string' ? JSON.parse(stored) : stored;
        if (!Array.isArray(rows)) return true;
        if (key === 'doterra_bottom_nav_order_v1' &&
            JSON.stringify(rows) === JSON.stringify(['scorta', 'shopping', 'catalog', 'recipes'])) continue;
        if (rows.length) return true;
      }
      return false;
    } catch (_) { return true; }
  }
  function mountSettings(panel) {
    if (!current() || hasPersonalData() || panel.querySelector('#dotapp-migration-import')) return;
    const host = panel.querySelector('[data-backup]')?.parentElement;
    if (!host) return;
    const card = element('section', '', host); card.id = 'dotapp-migration-import';
    card.setAttribute('aria-label', 'Hai già usato dōtapp?');
    card.style.cssText = 'border:1px solid #e8dfeb;border-radius:12px;margin-top:12px;padding:14px;background:#faf8fb;font:14px/1.5 system-ui';
    element('strong', 'HAI GIÀ USATO DŌTAPP?', card);
    element('p', 'Se arrivavi dalla vecchia versione, importa il backup per recuperare Scorta, Lista spesa, Ricettario e impostazioni.', card);
    button('IMPORTA IL MIO BACKUP', card, () => window.dotappBackup?.open({view: 'import'}));
  }
  function afterExport(parent) {
    if (!legacy()) return;
    parent.querySelector('#dotapp-migration-exported')?.remove();
    const card = element('section', '', parent); card.id = 'dotapp-migration-exported';
    const status = element('p', 'Backup salvato. Ora puoi aprire il nuovo dōtapp e importarlo.', card);
    status.setAttribute('role', 'status');
    const link = element('a', 'APRI IL NUOVO DŌTAPP', card);
    link.href = NEW_APP; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.style.cssText = buttonStyle + ';display:inline-flex;align-items:center;text-decoration:none';
    element('p', 'Non rimuovere ancora la vecchia app finché non hai verificato che tutti i dati siano presenti nel nuovo dōtapp.', card);
  }
  window.dotappMigration = Object.freeze({mountSettings, afterExport, isLegacy: legacy});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showNotice, {once: true});
  else showNotice();
})();
