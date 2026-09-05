(() => {
  'use strict';

  const STYLE_ID = 'scortaNavV12Style';
  const TOOLS_ID = 'scortaToolsBottomV12';
  const CATALOG_ID = 'scortaCatalogFloatV12';

  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #scortaPlusFab{display:none!important}
      #${TOOLS_ID}{
        position:fixed;z-index:2147483050;left:33.333vw;bottom:0;width:33.334vw;
        height:calc(86px + env(safe-area-inset-bottom));
        padding:10px 6px calc(9px + env(safe-area-inset-bottom));
        border:0;border-radius:0;background:rgba(250,243,249,.985);color:#4e4651;
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
        -webkit-tap-highlight-color:transparent;box-shadow:none;
      }
      #${TOOLS_ID} .ico{width:54px;height:34px;border-radius:18px;display:grid;place-items:center;
        font-size:23px;line-height:1;color:#6e5578;background:#f0d9f4}
      #${TOOLS_ID} .lbl{font-size:13px;line-height:1;font-weight:500;letter-spacing:.1px}
      #${TOOLS_ID}:active{background:#f2e8f1}
      #${CATALOG_ID}{
        position:fixed;z-index:2147483040;left:14px;bottom:calc(104px + env(safe-area-inset-bottom));
        min-width:132px;height:52px;padding:0 17px;border:0;border-radius:18px;
        background:#efd8f5;color:#4c3553;box-shadow:0 8px 24px rgba(57,39,64,.18);
        display:flex;align-items:center;justify-content:center;gap:9px;
        font:800 14px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
        -webkit-tap-highlight-color:transparent;
      }
      #${CATALOG_ID} .ico{font-size:19px;line-height:1}
      #${CATALOG_ID}:active{transform:scale(.98)}
      #scortaPlusPanel{z-index:2147483200!important}
      @media(max-width:360px){#${CATALOG_ID}{min-width:118px;padding:0 13px;font-size:13px}}
    `;
    document.head.appendChild(style);
  }

  function openTools(){
    if (typeof window.scortaPlusOpen === 'function') window.scortaPlusOpen();
  }

  function openCatalog(){
    if (typeof window.scortaPlusOpen !== 'function') return;
    window.scortaPlusOpen();
    setTimeout(()=>document.querySelector('#scortaPlusPanel [data-tab="catalog"]')?.click(),30);
  }

  function ensureButtons(){
    injectStyle();
    if (!document.getElementById(TOOLS_ID)){
      const b=document.createElement('button');
      b.id=TOOLS_ID;b.type='button';b.setAttribute('aria-label','Strumenti');
      b.innerHTML='<span class="ico">✦</span><span class="lbl">Strumenti</span>';
      b.addEventListener('click',openTools);
      document.body.appendChild(b);
    }
    if (!document.getElementById(CATALOG_ID)){
      const b=document.createElement('button');
      b.id=CATALOG_ID;b.type='button';b.setAttribute('aria-label','Catalogo');
      b.innerHTML='<span class="ico">▦</span><span>Catalogo</span>';
      b.addEventListener('click',openCatalog);
      document.body.appendChild(b);
    }
  }

  const observer=new MutationObserver(()=>{
    if (document.querySelector('flutter-view,flt-glass-pane,flt-scene-host,canvas')) ensureButtons();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ensureButtons,{once:true});
  else ensureButtons();
  setTimeout(ensureButtons,500);
  setTimeout(ensureButtons,1500);
})();
