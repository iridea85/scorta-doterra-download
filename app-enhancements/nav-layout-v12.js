(() => {
  'use strict';

  const STYLE_ID = 'scortaMainNavV22Style';
  const NAV_ID = 'scortaMainBottomNavV22';
  const MORE_ID = 'scortaHeaderMoreV22';
  const MENU_ID = 'scortaHeaderMenuV22';
  const INVENTORY_SUFFIX = 'doterra_inventory_v2';
  const MERGE_BACKUP_KEY = 'scorta_inventory_merge_backup_v1';
  let currentMode = 'inventory';
  let started = false;

  const normalize = (value) => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  function decodeRaw(raw){
    if (raw == null || raw === '') return { data: [], wrapped: true };
    try {
      const first = JSON.parse(raw);
      if (Array.isArray(first)) return { data: first, wrapped: false };
      if (typeof first === 'string') {
        const second = JSON.parse(first);
        if (Array.isArray(second)) return { data: second, wrapped: true };
      }
    } catch (_) {}
    return { data: [], wrapped: true };
  }

  function encodeLike(raw, data){
    const wrapped = decodeRaw(raw).wrapped;
    const json = JSON.stringify(data);
    return wrapped ? JSON.stringify(json) : json;
  }

  function inventoryKeys(){
    const keys=[];
    for(let i=0;i<localStorage.length;i+=1){
      const key=localStorage.key(i);
      if(key && key.endsWith(INVENTORY_SUFFIX)) keys.push(key);
    }
    return keys;
  }

  function productIdentity(product){
    const name=normalize(product?.name);
    if(name) return `name:${name}`;
    return `id:${String(product?.id || '')}`;
  }

  /* Recupero non distruttivo delle vecchie copie dell'inventario.
     La copia principale mantiene i propri valori; dalle altre recuperiamo
     soltanto prodotti che mancano completamente. */
  function unifyInventoryStorage(){
    const keys=inventoryKeys();
    if(keys.length < 2) return;

    const preferred = keys.find(k=>k === `flutter.${INVENTORY_SUFFIX}`)
      || keys.find(k=>k === INVENTORY_SUFFIX)
      || keys[0];
    const rawByKey={};
    keys.forEach(k=>{ rawByKey[k]=localStorage.getItem(k); });

    const base=decodeRaw(rawByKey[preferred]).data;
    const merged=Array.isArray(base) ? base.map(p=>({...p})) : [];
    const seen=new Set(merged.map(productIdentity));

    keys.filter(k=>k!==preferred).forEach(key=>{
      const list=decodeRaw(rawByKey[key]).data;
      (Array.isArray(list)?list:[]).forEach(product=>{
        const id=productIdentity(product);
        if(!id || seen.has(id)) return;
        seen.add(id);
        merged.push({...product});
      });
    });

    const largest=Math.max(...keys.map(k=>decodeRaw(rawByKey[k]).data.length),0);
    if(merged.length <= largest && keys.every(k=>decodeRaw(rawByKey[k]).data.length===merged.length)) return;

    try {
      if(!localStorage.getItem(MERGE_BACKUP_KEY)) {
        localStorage.setItem(MERGE_BACKUP_KEY, JSON.stringify({createdAt:new Date().toISOString(), storage:rawByKey}));
      }
      keys.forEach(key=>localStorage.setItem(key, encodeLike(rawByKey[key], merged)));
    } catch (_) {}
  }

  function readVisibleInventory(){
    const keys=inventoryKeys();
    if(!keys.length) return [];
    const preferred=keys.find(k=>k === `flutter.${INVENTORY_SUFFIX}`)
      || keys.find(k=>k === INVENTORY_SUFFIX)
      || keys[0];
    return decodeRaw(localStorage.getItem(preferred)).data || [];
  }

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #scortaPlusFab{display:none!important}
      #${NAV_ID}{
        position:fixed!important;left:0!important;right:0!important;bottom:0!important;
        z-index:2147483647!important;height:calc(86px + env(safe-area-inset-bottom))!important;
        padding:7px 0 env(safe-area-inset-bottom)!important;display:grid!important;
        grid-template-columns:repeat(3,1fr)!important;background:#fbf3fa!important;
        border-top:1px solid #eadfea!important;box-shadow:0 -2px 12px rgba(67,48,73,.035)!important;
        font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;
      }
      #${NAV_ID} button{border:0!important;background:transparent!important;color:#5f5662!important;
        display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;
        gap:4px!important;padding:5px!important;margin:0!important;min-width:0!important;-webkit-tap-highlight-color:transparent}
      #${NAV_ID} .ico{width:52px;height:32px;border-radius:18px;display:grid;place-items:center;font-size:21px;line-height:1;color:#6e5578}
      #${NAV_ID} .lbl{font-size:12px;line-height:1;font-weight:650;letter-spacing:.1px}
      #${NAV_ID} button.active .ico{background:#ecd9ef}
      #${NAV_ID} button.active .lbl{color:#6e5578}
      #${NAV_ID} button:active{background:#f3e7f1!important}

      #scortaPlusPanel{position:fixed!important;top:0!important;left:0!important;right:0!important;
        bottom:calc(86px + env(safe-area-inset-bottom))!important;height:auto!important;max-height:none!important;z-index:2147483200!important}
      #scortaPlusPanel .scp-tabs{display:none!important}
      #scortaPlusPanel #scpClose{display:none!important}
      #scortaPlusPanel .scp-head{padding-right:12px!important;position:relative!important}

      #${MORE_ID}{border:0;background:#f0e7f1;color:#6e5578;border-radius:13px;width:40px;height:40px;
        font-size:21px;font-weight:900;display:grid;place-items:center;flex:0 0 auto;-webkit-tap-highlight-color:transparent}
      #${MORE_ID}.active{background:#6e5578;color:#fff}
      #${MENU_ID}{position:absolute;right:10px;top:calc(100% - 2px);z-index:2147483500;width:min(230px,78vw);
        background:#fff;border:1px solid #e5dbe7;border-radius:17px;padding:7px;box-shadow:0 14px 35px rgba(54,39,58,.18)}
      #${MENU_ID} button{width:100%;border:0;background:transparent;border-radius:12px;padding:11px 12px;text-align:left;
        font-size:13px;font-weight:750;color:#4d4550;-webkit-tap-highlight-color:transparent}
      #${MENU_ID} button:active{background:#f6eef5}

      .scp-inventory-guide{background:#fff;border:1px solid #e6dfe8;border-radius:17px;padding:13px 14px;margin:0 0 10px;
        color:#756d78;font-size:12px;line-height:1.45}
      .scp-catalog-owned{display:inline-flex;margin-top:8px;padding:5px 8px;border-radius:999px;background:#eaf3e8;
        color:#4d7048;font-size:10px;font-weight:850}
    `;
    document.head.appendChild(style);
  }

  function removeOldNav(){
    [
      'scortaCatalogFloatV12','scortaToolsBottomV12','scortaToolsBottomV13','scortaToolsBottomV15',
      'scortaToolsBottomV16','scortaToolsBottomV17','scortaToolsNav','scpPersistentBottomNav',
      'scortaInventoryBottomProxyV17','scortaShoppingBottomProxyV17','scortaUnifiedBottomNavV18',
      'scortaUnifiedBottomNavV19','scortaUnifiedBottomNavV20','scortaSimpleBottomNavV21'
    ].forEach(id=>document.getElementById(id)?.remove());
  }

  function ensureNav(){
    if(document.getElementById('licenseGate')) return;
    injectStyle();
    removeOldNav();
    if(document.getElementById(NAV_ID)){ syncActive(); return; }
    const nav=document.createElement('nav');
    nav.id=NAV_ID;
    nav.setAttribute('aria-label','Navigazione principale');
    nav.innerHTML=`
      <button type="button" data-mainnav="inventory"><span class="ico">▣</span><span class="lbl">Inventario</span></button>
      <button type="button" data-mainnav="catalog"><span class="ico">▤</span><span class="lbl">Catalogo</span></button>
      <button type="button" data-mainnav="shopping"><span class="ico">⌑</span><span class="lbl">Spesa</span></button>`;
    document.body.appendChild(nav);
    nav.querySelector('[data-mainnav="inventory"]').addEventListener('click',()=>showView('home','inventory'));
    nav.querySelector('[data-mainnav="catalog"]').addEventListener('click',()=>showView('catalog','catalog'));
    nav.querySelector('[data-mainnav="shopping"]').addEventListener('click',()=>showView('shopping','shopping'));
    syncActive();
  }

  function ensureMoreButton(){
    const panel=document.getElementById('scortaPlusPanel');
    const head=panel?.querySelector('.scp-head');
    if(!head || head.querySelector(`#${MORE_ID}`)) return;
    const button=document.createElement('button');
    button.id=MORE_ID; button.type='button'; button.setAttribute('aria-label','Altre funzioni'); button.textContent='⋯';
    button.addEventListener('click',(event)=>{ event.stopPropagation(); toggleUtilityMenu(); });
    head.appendChild(button);
  }

  function toggleUtilityMenu(){
    const old=document.getElementById(MENU_ID);
    if(old){ old.remove(); return; }
    const head=document.querySelector('#scortaPlusPanel .scp-head');
    if(!head) return;
    const menu=document.createElement('div');
    menu.id=MENU_ID;
    menu.innerHTML=`
      <button type="button" data-util="history">Cronologia</button>
      <button type="button" data-util="data">Backup e dati</button>
      <button type="button" data-util="info">Informazioni</button>`;
    head.appendChild(menu);
    menu.querySelectorAll('[data-util]').forEach(button=>button.addEventListener('click',()=>{
      document.getElementById(MENU_ID)?.remove();
      showView(button.dataset.util,'utility');
    }));
  }

  function setHeader(title, subtitle=''){
    const panel=document.getElementById('scortaPlusPanel');
    const strong=panel?.querySelector('.scp-title strong');
    const sub=panel?.querySelector('.scp-title span');
    if(strong) strong.textContent=title;
    if(sub) sub.textContent=subtitle;
    ensureMoreButton();
  }

  function showView(tab, mode){
    if(document.getElementById('licenseGate')) return;
    unifyInventoryStorage();
    currentMode=mode;
    if(typeof window.scortaPlusShow === 'function') {
      window.scortaPlusShow(tab);
    } else if(typeof window.scortaPlusOpen === 'function') {
      window.scortaPlusOpen();
      setTimeout(()=>document.querySelector(`#scortaPlusPanel [data-tab="${tab}"]`)?.click(),20);
    }
    requestAnimationFrame(()=>decorate(tab));
    setTimeout(()=>decorate(tab),40);
    syncActive();
  }

  function decorate(tab){
    if(!document.getElementById('scortaPlusPanel')) return;
    ensureMoreButton();
    if(tab==='home') decorateInventory();
    else if(tab==='catalog') decorateCatalog();
    else if(tab==='shopping') setHeader('Lista della spesa','I prodotti che vuoi ordinare');
    else if(tab==='history') setHeader('Cronologia','Acquisti e movimenti registrati');
    else if(tab==='data') setHeader('Backup e dati','Salva o ripristina il tuo inventario');
    else if(tab==='info') setHeader('Informazioni','Versione e catalogo');
    syncActive();
  }

  function decorateInventory(){
    const inventory=readVisibleInventory();
    setHeader('Il mio inventario',`${inventory.length} ${inventory.length===1?'prodotto salvato':'prodotti salvati'}`);
    const body=document.querySelector('#scortaPlusPanel #scpBody');
    if(!body) return;
    body.querySelector('.scp-inventory-guide')?.remove();
    if(!inventory.length){
      const guide=document.createElement('div');
      guide.className='scp-inventory-guide';
      guide.innerHTML='<strong>Il tuo inventario è vuoto.</strong><br>Apri <b>Catalogo</b> qui sotto e aggiungi i prodotti che hai in casa.';
      body.prepend(guide);
    }
  }

  function decorateCatalog(){
    const inventory=readVisibleInventory();
    const byName=new Map(inventory.map(item=>[normalize(item.name),item]));
    setHeader('Catalogo doTERRA','Aggiungi nuovi prodotti senza perdere quelli già salvati');
    document.querySelectorAll('#scortaPlusPanel [data-catalog-name]').forEach(card=>{
      const item=byName.get(normalize(card.dataset.catalogName));
      card.querySelector('.scp-catalog-owned')?.remove();
      if(!item) return;
      const total=Math.max(0,Number(item.stock||0)) + (item.opened===true ? 1 : 0);
      const main=card.querySelector('.scp-main');
      if(main){
        const badge=document.createElement('span');
        badge.className='scp-catalog-owned';
        badge.textContent=`Nel tuo inventario · hai ${total}`;
        main.appendChild(badge);
      }
      const add=card.querySelector('[data-action="catInventory"]');
      if(add){ add.disabled=true; add.textContent=`Già salvato · hai ${total}`; }
    });
  }

  function syncActive(){
    const nav=document.getElementById(NAV_ID);
    if(!nav) return;
    nav.querySelectorAll('[data-mainnav]').forEach(button=>button.classList.remove('active'));
    if(currentMode==='inventory') nav.querySelector('[data-mainnav="inventory"]')?.classList.add('active');
    else if(currentMode==='catalog') nav.querySelector('[data-mainnav="catalog"]')?.classList.add('active');
    else if(currentMode==='shopping') nav.querySelector('[data-mainnav="shopping"]')?.classList.add('active');
    document.getElementById(MORE_ID)?.classList.toggle('active',currentMode==='utility');
  }

  function start(){
    if(document.getElementById('licenseGate')) return;
    unifyInventoryStorage();
    ensureNav();
    if(!started && typeof window.scortaPlusShow === 'function'){
      started=true;
      showView('home','inventory');
    }
  }

  const observer=new MutationObserver(()=>{
    start();
    if(started){ ensureNav(); ensureMoreButton(); syncActive(); }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  setTimeout(start,250);
  setTimeout(start,800);
  setTimeout(start,1800);
})();