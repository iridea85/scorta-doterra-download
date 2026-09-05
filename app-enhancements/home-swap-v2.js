(() => {
  'use strict';

  const STYLE_ID = 'scortaNavSwapV2Style';
  const TOOLS_ID = 'scortaToolsNav';

  const injectStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #scortaPlusFab{
        left:14px!important;
        right:auto!important;
        bottom:calc(96px + env(safe-area-inset-bottom))!important;
        min-width:112px;
        justify-content:center;
      }
      #${TOOLS_ID}{
        position:fixed;
        left:50%;
        bottom:0;
        transform:translateX(-50%);
        z-index:2147483050;
        width:33.333vw;
        min-width:110px;
        max-width:180px;
        height:calc(78px + env(safe-area-inset-bottom));
        padding:8px 8px calc(8px + env(safe-area-inset-bottom));
        border:0;
        border-radius:0;
        background:#f7edf6;
        color:#4f4652;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:3px;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
        -webkit-tap-highlight-color:transparent;
      }
      #${TOOLS_ID} .scp-tools-icon{font-size:24px;line-height:1;color:#6e5578}
      #${TOOLS_ID} .scp-tools-label{font-size:13px;line-height:1.15;font-weight:600}
      #${TOOLS_ID}:active{background:#eee0ef}
    `;
    document.head.appendChild(style);
  };

  const openTools = () => {
    if (typeof window.scortaPlusOpen === 'function') window.scortaPlusOpen();
  };

  const openCatalog = () => {
    if (typeof window.scortaPlusOpen !== 'function') return;
    window.scortaPlusOpen();
    setTimeout(() => {
      document.querySelector('#scortaPlusPanel [data-tab="catalog"]')?.click();
    }, 40);
  };

  const swapFab = () => {
    const fab = document.getElementById('scortaPlusFab');
    if (!fab || fab.dataset.scortaRole === 'catalog') return !!fab;

    const clean = fab.cloneNode(false);
    clean.id = 'scortaPlusFab';
    clean.className = fab.className;
    clean.dataset.scortaRole = 'catalog';
    clean.type = 'button';
    clean.innerHTML = '<span style="font-size:18px;line-height:1">▦</span><span>Catalogo</span>';
    clean.addEventListener('click', openCatalog);
    fab.replaceWith(clean);
    return true;
  };

  const ensureToolsNav = () => {
    if (!document.getElementById('scortaPlusFab')) return;
    if (document.getElementById(TOOLS_ID)) return;
    const button = document.createElement('button');
    button.id = TOOLS_ID;
    button.type = 'button';
    button.setAttribute('aria-label', 'Apri Strumenti');
    button.innerHTML = '<span class="scp-tools-icon">✦</span><span class="scp-tools-label">Strumenti</span>';
    button.addEventListener('click', openTools);
    document.body.appendChild(button);
  };

  const setup = () => {
    injectStyle();
    const ready = swapFab();
    if (ready) ensureToolsNav();
  };

  const observer = new MutationObserver(setup);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup, { once: true });
  } else {
    setup();
  }
  setTimeout(setup, 700);
  setTimeout(setup, 2000);
})();
