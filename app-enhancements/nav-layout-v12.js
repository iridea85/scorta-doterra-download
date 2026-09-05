(() => {
  'use strict';

  const STYLE_ID = 'scortaNavV15Style';
  const TOOLS_ID = 'scortaToolsBottomV15';

  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* Nasconde ogni vecchio pulsante flottante aggiunto in precedenza. */
      #scortaPlusFab{display:none!important}

      /* Strumenti occupa stabilmente il terzo centrale della barra Flutter. */
      #${TOOLS_ID}{
        position:fixed!important;
        z-index:2147483646!important;
        left:33.333vw!important;
        right:auto!important;
        bottom:0!important;
        width:33.334vw!important;
        height:calc(92px + env(safe-area-inset-bottom))!important;
        padding:10px 6px calc(9px + env(safe-area-inset-bottom))!important;
        border:0!important;
        border-radius:0!important;
        background:#f8eef7!important;
        color:#4e4651!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:5px!important;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;
        -webkit-tap-highlight-color:transparent;
        box-shadow:none!important;
      }
      #${TOOLS_ID} .ico{
        width:54px;
        height:34px;
        border-radius:18px;
        display:grid;
        place-items:center;
        font-size:22px;
        line-height:1;
        color:#6e5578;
        background:#efd8f3;
      }
      #${TOOLS_ID} .lbl{
        font-size:13px;
        line-height:1;
        font-weight:500;
        letter-spacing:.1px;
      }
      #${TOOLS_ID}:active{background:#f1e5ef!important}

      /* Strumenti NON è più full-screen: termina esattamente sopra la barra.
         In questo modo Inventario e Spesa del Flutter restano scoperti,
         mentre il nostro tasto Strumenti resta sopra a entrambi. */
      #scortaPlusPanel{
        position:fixed!important;
        top:0!important;
        left:0!important;
        right:0!important;
        bottom:calc(92px + env(safe-area-inset-bottom))!important;
        height:auto!important;
        max-height:none!important;
        z-index:2147483200!important;
      }
    `;
    document.head.appendChild(style);
  }

  function openTools(){
    if (typeof window.scortaPlusOpen === 'function') window.scortaPlusOpen();
  }

  function removeOldAddedButtons(){
    ['scortaCatalogFloatV12','scortaToolsBottomV12','scortaToolsBottomV13','scortaToolsNav'].forEach(id=>document.getElementById(id)?.remove());
  }

  function ensureTools(){
    injectStyle();
    removeOldAddedButtons();
    if (document.getElementById(TOOLS_ID)) return;
    const b=document.createElement('button');
    b.id=TOOLS_ID;
    b.type='button';
    b.setAttribute('aria-label','Strumenti');
    b.innerHTML='<span class="ico">⚙</span><span class="lbl">Strumenti</span>';
    b.addEventListener('click',openTools);
    document.body.appendChild(b);
  }

  const observer=new MutationObserver(()=>{
    if (document.querySelector('flutter-view,flt-glass-pane,flt-scene-host,canvas')) ensureTools();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',ensureTools,{once:true});
  else ensureTools();
  setTimeout(ensureTools,250);
  setTimeout(ensureTools,800);
  setTimeout(ensureTools,1800);
})();
