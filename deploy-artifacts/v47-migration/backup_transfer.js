/* Local-only dōtapp backup. Explicit storage allowlist; no network or credentials. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.dotappBackup = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const FORMAT = 'DOTAPP_BACKUP_V1', MAX = 20 * 1024 * 1024;
  const PREFS = ['doterra_inventory_v2', 'oils_inventory_v1', 'doterra_catalog_shopping_v1', 'doterra_custom_products_v1', 'doterra_personal_recipes_v1', 'doterra_inventory_order_v1', 'doterra_bottom_nav_order_v1'];
  const READ = 'doterra_app_messages_read_v1', KEYS = Object.freeze([...PREFS, READ]);
  const JOURNAL = 'dotapp_backup_restore_journal_v1';
  const physical = key => key === READ ? key : 'flutter.' + key;
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const fail = () => { throw new Error('Backup non valido o incompatibile. Nessun dato importato.'); };
  function rows(raw, key) {
    if (raw === null) return [];
    if (typeof raw !== 'string') return fail();
    let value; try { value = JSON.parse(raw); } catch (_) { return fail(); }
    if (!Array.isArray(value) || value.length > 50000) return fail();
    if (key === READ) {
      if (value.some(id => typeof id !== 'string' && !Number.isSafeInteger(id))) fail();
    } else if (key.endsWith('_order_v1')) {
      if (value.some(id => typeof id !== 'string')) fail();
    } else {
      for (const row of value) {
        if (!isObject(row)) fail();
        if (key === 'doterra_personal_recipes_v1') {
          for (const field of ['id', 'title', 'date']) if (typeof row[field] !== 'string') fail();
          for (const field of ['purpose','base','method','frequency','notes','result','tags']) if (row[field] != null && typeof row[field] !== 'string') fail();
          if (row.ingredients != null && (!Array.isArray(row.ingredients) || row.ingredients.some(i => !isObject(i) || Object.values(i).some(v => typeof v !== 'string')))) fail();
        } else {
          if (typeof row.name !== 'string' || !row.name.trim()) fail();
          if (key === 'doterra_custom_products_v1') {
            if (typeof row.id !== 'string' || !row.id.startsWith('custom:')) fail();
            if (row.aliases != null && (!Array.isArray(row.aliases) || row.aliases.some(v => typeof v !== 'string'))) fail();
          } else if (key === 'doterra_catalog_shopping_v1') {
            if (['productId','category','unit'].some(k => typeof row[k] !== 'string') || !Number.isInteger(row.quantity) || row.quantity < 0 || row.quantity > 9999) fail();
          } else {
            for (const k of ['stock','sealed','openedQuantity','targetReserve','shoppingQuantity','volumeMl']) if (row[k] != null && (typeof row[k] !== 'number' || !Number.isFinite(row[k]))) fail();
            for (const k of ['opened','trackOpening','shoppingDismissed','manualShopping','quantitySet','autoShoppingEnabled']) if (row[k] != null && typeof row[k] !== 'boolean') fail();
          }
        }
      }
    }
    return value;
  }
  function validate(backup) {
    if (!isObject(backup) || backup.format !== FORMAT || backup.version !== 1 || !isObject(backup.data) || typeof backup.createdAt !== 'string' || !Number.isFinite(Date.parse(backup.createdAt))) fail();
    if (Object.keys(backup).some(k => !['format','version','createdAt','data'].includes(k))) fail();
    if (Object.keys(backup.data).length !== KEYS.length || Object.keys(backup.data).some(k => !KEYS.includes(k))) fail();
    for (const key of KEYS) {
      if (!Object.hasOwn(backup.data, key)) fail();
      rows(backup.data[key], key);
    }
    return backup;
  }
  function decode(text) {
    if (typeof text !== 'string' || text.length > MAX) fail();
    let backup; try { backup = JSON.parse(text); } catch (_) { return fail(); }
    return validate(backup);
  }
  function readData(storage) {
    const data = Object.create(null);
    for (const key of KEYS) {
      const raw = storage.getItem(physical(key));
      data[key] = raw === null || key === READ ? raw : JSON.parse(raw);
      if (data[key] !== null && typeof data[key] !== 'string') fail();
    }
    return data;
  }
  function capture(storage) { return Object.fromEntries(KEYS.map(k => [physical(k), storage.getItem(physical(k))])); }
  function encode(storage) {
    if (storage.getItem(JOURNAL) !== null) throw new Error('Completa prima il ripristino interrotto.');
    const backup = validate({format: FORMAT, version: 1, createdAt: new Date().toISOString(), data: readData(storage)});
    const text = JSON.stringify(backup, null, 2);
    if (text.length > MAX) throw new Error('Backup troppo grande (limite 20 MB).');
    return text;
  }
  function matches(a, b) { return KEYS.every(k => a[k] === b[k]); }
  function applySnapshot(storage, snapshot) {
    for (const key of KEYS.map(physical)) snapshot[key] === null ? storage.removeItem(key) : storage.setItem(key, snapshot[key]);
    if (KEYS.some(k => storage.getItem(physical(k)) !== snapshot[physical(k)])) throw new Error('Verifica del ripristino non riuscita.');
  }
  function recover(storage) {
    const raw = storage.getItem(JOURNAL); if (raw === null) return false;
    let snapshot; try { snapshot = JSON.parse(raw); } catch (_) { return fail(); }
    if (!isObject(snapshot) || Object.keys(snapshot).length !== KEYS.length || KEYS.some(k => !Object.hasOwn(snapshot, physical(k)) || (snapshot[physical(k)] !== null && typeof snapshot[physical(k)] !== 'string'))) fail();
    applySnapshot(storage, snapshot); storage.removeItem(JOURNAL); return true;
  }
  function restore(storage, backup, confirmed = false) {
    if (confirmed !== true) throw new Error('Conferma richiesta: nessun dato modificato.');
    validate(backup);
    if (storage.getItem(JOURNAL) !== null) throw new Error('Completa prima il ripristino interrotto.');
    const before = capture(storage);
    try {storage.setItem(JOURNAL, JSON.stringify(before));}
    catch (_) {throw new Error('Spazio non sufficiente per importare in sicurezza. Nessun dato modificato.');}
    try {
      for (const key of KEYS) {
        const value = backup.data[key];
        if (value === null) storage.removeItem(physical(key));
        else storage.setItem(physical(key), key === READ ? value : JSON.stringify(value));
      }
      const actual = readData(storage);
      validate({format: FORMAT, version: 1, createdAt: backup.createdAt, data: actual});
      if (!matches(actual, backup.data)) throw new Error('Dati importati non leggibili.');
      storage.removeItem(JOURNAL);
      return summarize(backup);
    } catch (error) {
      try { applySnapshot(storage, before); storage.removeItem(JOURNAL); }
      catch (_) { throw new Error('Ripristino interrotto: riapri Backup e trasferimento dati per recuperare i dati precedenti.'); }
      throw new Error('Importazione non riuscita. I dati precedenti sono stati ripristinati.');
    }
  }
  function summarize(backup) {
    validate(backup);
    const data = backup.data, inventory = rows(data.doterra_inventory_v2 ?? data.oils_inventory_v1, 'doterra_inventory_v2');
    const shoppingByKey = new Map();
    for (const e of rows(data.doterra_catalog_shopping_v1, 'doterra_catalog_shopping_v1')) {const k=e.productId || `${e.name}|${e.category}|${e.unit}`;if(!shoppingByKey.has(k))shoppingByKey.set(k,e);}
    const shopping = [...shoppingByKey.values()];
    const matching = (a,b) => a.productId && b.catalogProductId ? a.productId === b.catalogProductId : a.name.toLowerCase() === b.name.toLowerCase() && a.category.toLowerCase() === (b.category || 'Oli essenziali singoli').toLowerCase();
    for (const item of inventory) {
      const stock = item.stock ?? item.sealed ?? 0, reserve = item.targetReserve ?? 1;
      if (item.autoShoppingEnabled == null && item.quantitySet !== false && !(item.shoppingQuantity > 0) && !item.shoppingDismissed && reserve > stock && !shopping.some(e => matching(e,item))) shopping.push({name:item.name,category:item.category || 'Oli essenziali singoli',productId:item.catalogProductId || '',quantity:reserve-stock});
    }
    let count = shopping.filter(e => e.quantity > 0).length;
    for (const item of inventory) {
      const opened = item.openedQuantity ?? (item.opened ? 1 : 0), stock = item.stock ?? item.sealed ?? 0;
      const auto = item.autoShoppingEnabled ?? ((item.targetReserve ?? 1) > 0);
      const wanted = (item.shoppingQuantity ?? (item.manualShopping ? 1 : 0)) > 0 || (!item.shoppingDismissed && item.quantitySet !== false && auto && stock + opened === 0);
      if (wanted && !shopping.some(e => matching(e,item))) count++;
    }
    return {inventory: inventory.length, shopping:count, recipes:rows(data.doterra_personal_recipes_v1,'doterra_personal_recipes_v1').length,customProducts:rows(data.doterra_custom_products_v1,'doterra_custom_products_v1').length,settings:inventory.length > 0 || [data.doterra_inventory_order_v1,data.doterra_bottom_nav_order_v1,data[READ]].some(v => v !== null)};
  }
  function open(options = {}) {
    if (document.querySelector('#dotapp-backup-panel')) return;
    const shade = document.createElement('div'); shade.id = 'dotapp-backup-panel';
    shade.style.cssText = 'position:fixed;inset:0;z-index:1000002;background:#22152988;display:grid;place-items:center;padding:12px;font:16px/1.45 system-ui;color:#302637';
    const box = document.createElement('section'); box.setAttribute('role','dialog'); box.setAttribute('aria-modal','true'); box.setAttribute('aria-label','Backup e trasferimento dati');
    box.style.cssText = 'box-sizing:border-box;background:white;border-radius:18px;padding:20px;width:min(480px,100%);max-height:90dvh;overflow:auto;overflow-wrap:anywhere';shade.append(box);document.body.append(shade);
    const previousFocus = document.activeElement;
    const close = () => {shade.remove();previousFocus?.focus?.();};
    const add = (tag,text) => {const n=document.createElement(tag);n.textContent=text;box.append(n);return n;};
    const button = (text,action) => {const b=add('button',text);b.type='button';b.style.cssText='font:inherit;min-height:44px;width:100%;padding:10px;margin:6px 0;border:1px solid #d8c9de;border-radius:10px;background:#faf8fb;color:#60476b;cursor:pointer';b.onclick=action;return b;};
    const reset = () => box.replaceChildren();
    const status = text => {const n=add('p',text);n.setAttribute('role','status');};
    function summary(backup) {const s=summarize(backup);add('h3','Backup dōtapp');for(const text of [`Inventario: ${s.inventory} prodotti`,`Lista spesa: ${s.shopping}`,`Ricette: ${s.recipes}`,`Prodotti personalizzati: ${s.customProducts}`,`Impostazioni: ${s.settings?'presenti':'non presenti'}`])add('p',text);}
    function preview(text) {
      try {
        const backup=decode(text);reset();summary(backup);
        add('p','Il backup sostituirà i dati dōtapp di questo browser. Se ne hai già, esportali prima.');
        button('ANNULLA',home);
        const confirm=button('IMPORTA DATI',()=>{
          confirm.disabled=true;
          try {restore(localStorage,backup,true);reset();status('Dati importati e verificati. Riapertura dell’app…');setTimeout(()=>location.reload(),500);}
          catch(e){status(e.message);confirm.disabled=false;}
        });
      } catch(e) {status(e.message);}
    }
    async function download(text) {
      if (typeof window !== 'undefined' && window.dotappMigration?.isLegacy() && window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({suggestedName:'dotapp-backup-'+new Date().toISOString().slice(0,10)+'.json',types:[{description:'Backup dōtapp',accept:{'application/json':['.json']}}]});
          const writable = await handle.createWritable();await writable.write(text);await writable.close();
          window.dotappMigration?.afterExport(box);return;
        } catch(e) { if(e.name!=='AbortError')status('File non salvato. Riprova o copia il backup.');return; }
      }
      try {
      const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='dotapp-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      if(typeof window!=='undefined' && window.dotappMigration?.isLegacy()){
        if(!box.querySelector('[data-backup-save-confirm]')){
          status('Download avviato. Verifica che il file sia presente nei download del dispositivo.');
          const confirm=button('HO SALVATO IL BACKUP',()=>{confirm.remove();window.dotappMigration.afterExport(box);});
          confirm.setAttribute('data-backup-save-confirm','');
        }
      }
      } catch (_) {status('File non salvato. Riprova o copia il backup.');}
    }
    function home() {
      reset();add('h2','Backup e trasferimento dati');
      if(localStorage.getItem(JOURNAL)!==null){
        add('p','Un’importazione è stata interrotta. Puoi recuperare i dati precedenti.');
        button('RIPRISTINA DATI PRECEDENTI',()=>{try{recover(localStorage);status('Dati precedenti recuperati. Riapertura dell’app…');setTimeout(()=>location.reload(),500);}catch(e){status(e.message);}});button('Chiudi',close);return;
      }
      add('p','Salva un file sul tuo dispositivo e importalo nella nuova app. Il backup non viene inviato a server.');
      button('ESPORTA BACKUP DŌTAPP',()=>{try{
        const text=encode(localStorage);reset();summary(decode(text));
        button('SALVA FILE JSON',()=>download(text));
        button('COPIA BACKUP',async()=>{try{await navigator.clipboard.writeText(text);status('Backup copiato.');}catch(_){status('Seleziona e copia il testo del backup.');}});
        const area=add('textarea','');area.value=text;area.readOnly=true;area.setAttribute('aria-label','Testo completo del backup');area.style.cssText='box-sizing:border-box;width:100%;min-height:100px;font:12px monospace';button('Indietro',home);
      }catch(e){status(e.message);}});
      button('IMPORTA BACKUP DŌTAPP',importView);
      button('Chiudi',close);
    }
    function importView() {
        reset();add('h2','Importa backup dōtapp');
        const file=add('input','');file.type='file';file.accept='.json,application/json';file.setAttribute('aria-label','Scegli file backup dōtapp');file.style.cssText='width:100%;min-height:44px';
        file.onchange=async()=>{try{const f=file.files?.[0];if(!f)return;if(f.size>MAX)throw new Error('File troppo grande (limite 20 MB).');preview(await f.text());}catch(e){status(e.message);}};
        add('p','Oppure incolla il backup:');const area=add('textarea','');area.setAttribute('aria-label','Incolla backup dōtapp');area.maxLength=MAX;area.style.cssText='box-sizing:border-box;width:100%;min-height:150px;font:12px monospace';
        button('MOSTRA RIEPILOGO',()=>preview(area.value));button('ANNULLA',home);
    }
    shade.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const focus=[...box.querySelectorAll('button,input,textarea')].filter(n=>!n.disabled);if(focus.length){const i=focus.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();focus.at(-1).focus();}else if(!e.shiftKey&&i===focus.length-1){e.preventDefault();focus[0].focus();}}}});
    try {if(options.view==='import' && localStorage.getItem(JOURNAL)===null)importView();else home();box.querySelector('input,button')?.focus();}
    catch (_) {reset();add('h2','Backup e trasferimento dati');status('Dati locali non disponibili in questo browser. Riprova senza cancellare i dati dell’app.');button('Chiudi',close);}
  }
  return Object.freeze({FORMAT,KEYS,encode,decode,summarize,restore,recover,open});
});
