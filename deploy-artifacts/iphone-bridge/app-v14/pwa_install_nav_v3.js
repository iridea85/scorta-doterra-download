/* New-origin PWA installation only. Personal data and transfer protocol are not accessed. */
(() => {
  'use strict';
  const w=window;if(location.origin!=='https://do-tapp.it')return;
  const VERSION='dotapp-pwa-install-v2', RELOAD='dotapp_pwa_control_reload_v2';
  let deferredPrompt=null,registration=null,active=false,controlled=false,waitingSinceReady=false,installing=false,installedEvent=false,registrationError=null,controlTimer,promptTimer,button;
  const subscribers=new Set();
  function standalone(){return !!w.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone===true;}
  function installed(){return installedEvent||standalone();}
  function state(){return {version:VERSION,secure:w.isSecureContext===true,scope:registration?.scope||null,active,controlled,workerState:registration?.active?.state||null,controllerState:navigator.serviceWorker?.controller?.state||null,promptObserved:!!deferredPrompt,ready:active&&controlled,available:!!deferredPrompt&&active&&controlled&&!installed(),installed:installed(),installing,pending:!registrationError&&!waitingSinceReady&&!installed(),error:registrationError};}
  function paint(){
    const s=state(),owned=!!document.getElementById('dotapp-transfer-v2')?.isConnected;
    if(!s.available||owned||w.dotappInstallLayoutRegistered){button?.remove();button=null;}
    else if(!button){button=document.createElement('button');button.type='button';button.textContent='↓ Installa';button.id='dotapp-native-install';button.style.cssText='position:fixed;top:calc(10px + env(safe-area-inset-top));right:12px;z-index:99999;min-height:48px;padding:4px 8px;border:1px solid #ddd;border-radius:12px;background:white;color:#6e5578;font:700 13px system-ui;cursor:pointer';button.onclick=install;document.body.append(button);}
  }
  function publish(){
    const s=state();paint();
    try{w.dotappInstallLayoutChanged?.(s.available&&!document.getElementById('dotapp-transfer-v2')?.isConnected);}catch(_){}
    document.documentElement?.setAttribute('data-dotapp-pwa-state',JSON.stringify(s));
    console.info('[dōtapp PWA]',JSON.stringify(s));
    for(const fn of subscribers)try{fn(s);}catch(_){}
  }
  function controller(){const c=navigator.serviceWorker?.controller;return !!c && c.state==='activated' && new URL(c.scriptURL,location.href).origin===location.origin && new URL(c.scriptURL,location.href).pathname==='/flutter_service_worker.js';}
  function checkControl(){
    controlled=controller();
    if(controlled){w.clearTimeout(controlTimer);controlTimer=null;if(active&&!promptTimer&&!installed())promptTimer=w.setTimeout(()=>{waitingSinceReady=true;publish();},30000);}
    publish();
  }
  function watchController(){navigator.serviceWorker?.controller?.addEventListener?.('statechange',checkControl);checkControl();}
  function maybeReload(){
    if(w.dotappUpdates)return;
    if(!active||controller()||registration?.scope!==location.origin+'/')return;
    // A transfer is never interrupted. Its existing success flag is the only migration value read.
    try{if(/^#transfer=/.test(location.hash)&&localStorage.getItem('dotapp_transfer_completed_v2')!=='true'){controlTimer=w.setTimeout(maybeReload,1500);return;}
      if(w.sessionStorage.getItem(RELOAD)==='true')return;
      w.sessionStorage.setItem(RELOAD,'true');location.reload();
    }catch(_){/* Without a reliable session guard, do not reload. */}
  }
  async function prepare(){
    try{
      if(!('serviceWorker' in navigator)||!w.isSecureContext)throw Error('Registrazione PWA non disponibile in questo browser.');
      const result=await navigator.serviceWorker.register('flutter_service_worker.js?v='+VERSION,{scope:'/',updateViaCache:'none'});
      const ready=await navigator.serviceWorker.ready;
      registration=ready||result;
      if(registration.scope!==location.origin+'/')throw Error('Ambito service worker inatteso.');
      if(registration.active?.state!=='activated')await new Promise((resolve,reject)=>{
        const worker=registration.active||registration.installing||registration.waiting;
        if(!worker){reject(Error('Service worker non attivo.'));return;}
        const change=()=>{if(worker.state==='activated'){worker.removeEventListener('statechange',change);resolve();}else if(worker.state==='redundant'){worker.removeEventListener('statechange',change);reject(Error('Attivazione service worker non riuscita.'));}};
        worker.addEventListener('statechange',change);change();
      });
      active=true;watchController();if(!controlled)controlTimer=w.setTimeout(maybeReload,3000);
    }catch(e){registrationError=e?.message||'Preparazione installazione non completata.';publish();}
    return state();
  }
  async function install(){
    if(!state().available)return;
    const event=deferredPrompt;deferredPrompt=null;installing=true;publish();
    try{
      // No await before prompt(): this call belongs to the actual user's tap.
      const prompt=event.prompt();await prompt;await event.userChoice;
    }catch(_){/* A declined/failed installation does not change the transferred data. */}
    installing=false;waitingSinceReady=true;publish();
  }
  w.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;waitingSinceReady=false;publish();});
  w.addEventListener('appinstalled',()=>{installedEvent=true;deferredPrompt=null;installing=false;w.clearTimeout(promptTimer);publish();});
  navigator.serviceWorker?.addEventListener('controllerchange',watchController);
  w.matchMedia?.('(display-mode: standalone)').addEventListener?.('change',publish);
  w.dotappPwaInstall=Object.freeze({get status(){return state();},install,refresh:publish,subscribe(fn){subscribers.add(fn);return()=>subscribers.delete(fn);}});
  publish();w.dotappPwaInstallReady=prepare();
})();
