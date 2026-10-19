/* One guided path. Manual backup is used only from Settings or after repeated failure. */
(() => {
  'use strict';
  const w=window, config=w.DOTAPP_TRANSFER_CONFIG, protocol=w.dotappTransferProtocol, api=w.dotappBackup;
  if(!config||!protocol||!api){w.dotappStartApplication?.();return;}
  const COMPLETE='dotapp_transfer_completed_v2', SUMMARY='dotapp_transfer_summary_v2';
  const isLegacy=()=>location.origin===config.legacyOrigin && config.legacyPaths.some(path=>location.pathname.startsWith(path));
  const isNew=()=>location.origin===config.newOrigin;
  const match=location.hash.match(/^#transfer=([a-f0-9]{64})$/);
  const isTransfer=isNew() && !!match;
  let panel, box, installEvent=null, installSeen=false, successData=null, sender, recipient, closed=false;
  const buttonStyle='font:inherit;font-weight:700;min-height:48px;padding:12px 16px;border:0;border-radius:12px;background:#6e5578;color:white;cursor:pointer;width:100%;margin-top:12px';
  function el(tag,text,parent=box){const n=document.createElement(tag);n.textContent=text;if(parent)parent.append(n);return n;}
  function button(text,action){const b=el('button',text);b.type='button';b.style.cssText=buttonStyle;b.onclick=action;return b;}
  function openPanel() {
    if(panel?.isConnected)return;
    panel=el('div','',document.body);panel.id='dotapp-transfer-v2';
    panel.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#f7f5f7;display:grid;place-items:center;padding:20px;box-sizing:border-box;font:16px/1.5 system-ui;color:#302637';
    box=el('section','',panel);box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Passa al nuovo dōtapp');
    box.style.cssText='box-sizing:border-box;background:white;border:1px solid #e8dfeb;border-radius:22px;padding:24px;width:min(460px,100%);max-height:90dvh;overflow:auto;box-shadow:0 10px 40px #38244315';
    box.addEventListener('keydown',event=>{if(event.key==='Tab'){const buttons=[...box.querySelectorAll('button')].filter(b=>!b.disabled);if(buttons.length){const i=buttons.indexOf(document.activeElement);if(event.shiftKey&&i<=0){event.preventDefault();buttons.at(-1).focus();}else if(!event.shiftKey&&i===buttons.length-1){event.preventDefault();buttons[0].focus();}}}});
  }
  function screen(title,text){openPanel();box.replaceChildren();el('h2',title);const p=el('p',text);p.setAttribute('role','status');}
  function launchApp() {try{w.dotappStartApplication?.();}catch(_){}}
  function cleanSummary(value) {
    if(!value || typeof value!=='object')return null;
    const out={};for(const key of ['inventory','shopping','recipes','customProducts']){
      if(!Number.isSafeInteger(value[key]) || value[key]<0)return null;out[key]=value[key];
    }return out;
  }
  function rememberTransfer(detail) {
    const summary=cleanSummary(detail.summary);successData={summary};
    try{localStorage.setItem(COMPLETE,'true');}catch(_){}
    try{if(summary)localStorage.setItem(SUMMARY,JSON.stringify(summary));}catch(_){}
  }
  function completedTransfer() {
    try{if(localStorage.getItem(COMPLETE)!=='true')return false;
      let summary=null;try{summary=cleanSummary(JSON.parse(localStorage.getItem(SUMMARY)));}catch(_){}
      successData={summary};return true;
    }catch(_){return false;}
  }
  function clearNonce(){try{history.replaceState(null,'',location.pathname+location.search);}catch(_){}}
  function escapeUX(){closed=true;panel?.remove();launchApp();}
  function sourceState(name,detail={}) {
    if(name==='preparing')screen('🌿 Passiamo al nuovo dōtapp','Prepariamo i tuoi dati. La nuova app si apre in un’altra finestra.');
    if(name==='sending')screen('🌿 Trasferimento in corso','Lascia aperte entrambe le finestre.');
    if(name==='success')screen('✅ TUTTO TRASFERITO!','Completa l’installazione nella nuova finestra. I dati restano anche nella vecchia app.');
    if(name==='error'){
      screen('Il trasferimento non è riuscito.',detail.reason==='popup'?'Consenti l’apertura del nuovo dōtapp e riprova.':'I tuoi dati sono ancora nella vecchia app.');
      button('RIPROVA',()=>sender.start());
      if(detail.failures>=2 && detail.reason!=='popup')manualFallback(false);
    }
  }
  function manualFallback(importing) {
    const manual=button('TRASFERIMENTO MANUALE',()=>{
      if(importing){recipient?.dispose();try{history.replaceState(null,'',location.pathname+location.search);}catch(_){}}
      else sender?.dispose();
      panel?.remove();launchApp();api.open(importing?{view:'import'}:{});
    });
    manual.style.cssText='font:inherit;font-size:13px;min-height:44px;border:0;background:none;color:#60476b;text-decoration:underline;width:100%;margin-top:10px';
  }
  function installed(){return installSeen || w.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone===true;}
  function ios(){return /iPhone|iPad|iPod/i.test(navigator.userAgent||'') || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);}
  function closeReady(){closed=true;panel?.remove();launchApp();}
  function secondary(text,action){const b=button(text,action);b.style.cssText=buttonStyle+';background:transparent;color:#60476b;font-weight:500';return b;}
  function installedScreen(){screen('✅ dōtapp installato','I tuoi dati sono già pronti. Puoi aprire dōtapp dalla schermata Home.');button('APRI DŌTAPP',closeReady);}
  async function install() {
    if(installed()){renderSuccess(true);return;}
    if(!installEvent){renderSuccess(true,true);return;}
    const event=installEvent;installEvent=null;
    // A native installation prompt is one-shot. Cancellation or rejection never changes transfer state.
    try {
      const prompted=event.prompt();await prompted;const choice=await event.userChoice;
      if(installSeen)return;
      renderSuccess(true,choice?.outcome!=='accepted');
      if(choice?.outcome==='accepted')el('p','Conferma l’installazione richiesta da Android. Puoi continuare nel browser mentre termina.');
    }catch(_){renderSuccess(true,true);}
  }
  function renderSuccess(resuming=false,guidance=false) {
    if(!successData || closed)return;
    if(installed()){screen('✅ TUTTO PRONTO','I tuoi dati sono già nel nuovo dōtapp.');launchApp();w.setTimeout(closeReady,900);return;}
    const nativeReady=!!installEvent && !resuming && !guidance;
    screen(guidance?'✅ I TUOI DATI SONO GIÀ STATI TRASFERITI':resuming?'✅ I tuoi dati sono già qui':nativeReady?'✅ TUTTO TRASFERITO!':'✅ I TUOI DATI SONO GIÀ STATI TRASFERITI',nativeReady?'I tuoi dati sono già nel nuovo dōtapp.':'Puoi già usare dōtapp da questo browser.');
    const s=successData.summary;
    if(s){el('p',`🧴 Scorta: ${s.inventory} prodotti`);el('p',`🛒 Lista spesa: ${s.shopping}`);el('p',`📖 Ricette: ${s.recipes}`);}
    if(ios()){
      el('h3','INSTALLA DŌTAPP');const list=el('ol','');
      for(const step of ['Tocca il pulsante Condividi di Safari','Tocca “Aggiungi alla schermata Home”','Tocca “Aggiungi”'])el('li',step,list);
      el('p','I dati sono in Safari. L’app aggiunta alla Home può avere un archivio separato: verifica la scorta prima di rimuovere la vecchia app.');
    }else{
      button(nativeReady?'INSTALLA DŌTAPP':'RIPROVA INSTALLAZIONE',install);
      if(!installEvent || guidance){el('h3','INSTALLA DŌTAPP');el('p','Apri il menu ⋮ di Chrome e scegli Installa app / Aggiungi a schermata Home.');}
    }
    secondary('CONTINUA NEL BROWSER',closeReady);
  }
  async function receiverState(name,detail={}) {
    if(name==='waiting')screen('🌿 Trasferimento dei tuoi dati','Collegamento con la vecchia app…');
    if(name==='importing')screen('🌿 Trasferimento in corso','Stiamo verificando che tutti i dati siano presenti.');
    if(name==='error'){
      screen('Il trasferimento non è riuscito.','I dati precedenti sono stati conservati.');button('RIPROVA',()=>recipient.begin());
      if(detail.failures>=2)manualFallback(true);
    }
    if(name==='success'){
      rememberTransfer(detail);launchApp();renderSuccess();
      try {
        const apps=await navigator.getInstalledRelatedApps?.();
        installSeen=installSeen || !!apps?.some(a=>a.platform==='webapp' && [a.id,a.url].some(value=>{try{return new URL(value,config.newUrl).href===config.newUrl;}catch(_){return false;}}));
      } catch(_){}
      renderSuccess();
    }
  }
  w.addEventListener('beforeinstallprompt',event=>{
    if(!isNew() || (!isTransfer && !successData))return;event.preventDefault();installEvent=event;
    if(successData && !installSeen && !closed)renderSuccess(!isTransfer);
  });
  w.addEventListener('appinstalled',()=>{installSeen=true;installEvent=null;if(successData && !closed)installedScreen();});
  function start() {
    if(isNew() && completedTransfer()){w.dotappMigrationOwnsInstall=true;if(isTransfer)clearNonce();launchApp();renderSuccess(true);return;}
    if(isTransfer){w.dotappMigrationOwnsInstall=true;recipient=protocol.receiver({w,storage:localStorage,api,config,token:match[1],onState:receiverState});recipient.begin();w.dotappMigrationManaged=true;return;}
    launchApp();
    if(!isLegacy())return;
    try {if(localStorage.getItem(protocol.COMPLETED)==='true' || localStorage.getItem('dotapp_migration_dismissed_v2')==='true')return;}catch(_){return;}
    sender=protocol.source({w,storage:localStorage,api,config,onState:sourceState});
    screen('🌿 dōtapp ha un nuovo indirizzo','Abbiamo spostato dōtapp al nuovo indirizzo. Tocca il pulsante qui sotto: trasferiremo automaticamente i tuoi dati.');
    const close=button('×',()=>{try{localStorage.setItem('dotapp_migration_dismissed_v2','true');}catch(_){}panel.remove();});
    close.setAttribute('aria-label','Rimanda la migrazione');close.style.cssText='float:right;border:0;background:none;color:#60476b;min-width:44px;min-height:44px;font-size:24px;cursor:pointer';
    button('PASSA AL NUOVO DŌTAPP',()=>sender.start());
  }
  // Compatibility hooks for the unchanged Settings/manual-backup UI.
  w.dotappMigration=Object.freeze({isLegacy,mountSettings(){},afterExport(){}});
  function safeStart(){try{start();}catch(_){escapeUX();}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',safeStart,{once:true});else safeStart();
})();
