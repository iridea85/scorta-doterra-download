(() => {
  'use strict';

  const STYLE_ID = 'scortaNavV13Style';
  const TOOLS_ID = 'scortaToolsBottomV13';

  function injectStyle(){
    if (document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      /* Nasconde il vecchio pulsante flottante Strumenti/Catalogo. */
      #scortaPlusFab{display:none!important}

      /* Strumenti sostituisce visivamente Catalogo nella posizione centrale
         della barra inferiore Flutter. */
      #${TOOLS_ID}{
        position:fixed;
        z-index:2147483050;
        left:33.333vw;
        bottom:0;
        width:33.334vw;
        height:calc(92px + env(safe-area-inset-bottom));
        padding:10px 6px calc(9px + env(safe-area-inset-bottom));
        border:0;
        border-radius:0;
        background:#f8eef7;
        color:#4e4651;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        gap:5px;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;
        -webkit-tap-highlight-color:transparent;
        box-shadow:none;
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
      #${TOOLS_ID}:active{background:#f1e5ef}

      /* Il pannello Strumenti non copre più la barra in basso.
         Inventario · Strumenti · Spesa restano sempre visibili e cliccabili. */
      #scortaPlusPanel{
        z-index:2147483200!important;
        bottom:calc(92px + env(safe-area-inset-bottom))!important;
      }
    `;
    document.head.appendChild(style);
  }

  function openTools(){
    if (typeof window.scortaPlusOpen === 'function') window.scortaPlusOpen();
  }

  function removeOldAddedButtons(){
    document.getElementById('scortaCatalogFloatV12')?.remove();
    document.getElementById('scortaToolsBottomV12')?.remove();
    document.getElementById('scortaToolsNav')?.remove();
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
  setTimeout(ensureTools,500);
  setTimeout(ensureTools,1500);
})();
