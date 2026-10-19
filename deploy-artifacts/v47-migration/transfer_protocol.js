/* Browser-to-browser transport for the existing DOTAPP_BACKUP_V1. No network I/O. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.dotappTransferProtocol = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const VERSION = 2, MAX = 20 * 1024 * 1024, NONCE = /^[a-f0-9]{64}$/;
  const COMPLETED = 'dotapp_migration_completed_v2';
  const JOURNAL = 'dotapp_backup_restore_journal_v1';
  const forbidden = /^(?:__proto__|prototype|constructor|access_token|refresh_token|id_token|authorization|apikey|api_key|password|credentials|cookie|cookies|session|session_token|supabase.*|sb-.*)$/i;
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') {
      const keys = Object.keys(value).sort();
      if (keys.some(k => forbidden.test(k))) throw Error('Dati tecnici non consentiti.');
      return '{' + keys.map(k => JSON.stringify(k)+':'+canonical(value[k])).join(',') + '}';
    }
    return JSON.stringify(value);
  }
  function logical(backup, keys = Object.keys(backup.data)) {
    return canonical(keys.slice().sort().map(k => [k, backup.data[k] === null ? null : JSON.parse(backup.data[k])]));
  }
  async function digest(crypto, text) {
    const bytes = new TextEncoder().encode(text);
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2,'0')).join('');
  }
  function nonce(crypto) {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2,'0')).join('');
  }
  function decode(api, payload) {
    if (typeof payload !== 'string' || payload.length > MAX || new TextEncoder().encode(payload).length > MAX) throw Error('Backup non valido.');
    const backup = api.decode(payload);
    logical(backup); // Also reject forbidden technical keys within saved records.
    return backup;
  }
  function summary(api, backup) {
    const data = api.summarize(backup);
    return {inventory:data.inventory,shopping:data.shopping,recipes:data.recipes,customProducts:data.customProducts};
  }
  function sameSummary(a,b) { return !!a && Object.keys(b).every(k => a[k] === b[k]); }
  function envelope(event, origin, source, token) {
    const d=event.data;
    return event.origin===origin && event.source===source && d && typeof d==='object' && !Array.isArray(d) &&
      d.version===VERSION && d.nonce===token && NONCE.test(d.nonce) && typeof d.type==='string';
  }
  function source(options) {
    const {w,storage,api,config} = options;
    const state = options.onState || (()=>{});
    let pending=null, failures=0;
    function clear(p) { if(p){w.clearTimeout(p.timer);w.clearInterval(p.poll);} }
    function fail(reason, keep=false) {
      if(!pending)return;
      const p=pending;clear(p);failures++;
      if(!keep){pending=null;p.payload=null;}
      state('error',{reason,failures});
    }
    function arm(p) {
      clear(p);
      p.timer=w.setTimeout(()=>{if(pending===p)fail('timeout');},120000);
      p.poll=w.setInterval(()=>{try{if(pending===p && p.child.closed)fail('closed');}catch(_){if(pending===p)fail('opener');}},1000);
    }
    function send(p) {
      if(pending!==p || !p.ready || !p.checksum || p.sent)return;
      p.sent=true;
      try {p.child.postMessage({type:'TRANSFER_PAYLOAD',version:VERSION,nonce:p.nonce,payload:p.payload,checksum:p.checksum,summary:p.summary},config.newOrigin);state('sending');}
      catch(_){fail('opener');}
    }
    function receive(event) {
      const p=pending;
      if(!p || !envelope(event,config.newOrigin,p.child,p.nonce))return;
      const d=event.data;
      if(d.type==='READY') {p.ready=true;p.sent=false;arm(p);send(p);}
      else if(d.type==='TRANSFER_ERROR') {p.sent=false;fail('receiver',true);}
      else if(d.type==='TRANSFER_SUCCESS' && d.status==='PASS' && p.sent && d.checksum===p.checksum && sameSummary(d.summary,p.summary)) {
        clear(p);pending=null;p.payload=null;
        let remembered=true;try{storage.setItem(COMPLETED,'true');}catch(_){remembered=false;}
        state('success',{summary:d.summary,checksum:d.checksum,remembered});
      }
    }
    w.addEventListener('message',receive);
    function start() {
      if(pending){clear(pending);pending.payload=null;pending=null;}
      let token,child;
      try {
        token=nonce(w.crypto);
        // This call is synchronous, in the user's click handler, before any await.
        child=w.open(config.newUrl+'#transfer='+token,'_blank');
      } catch(_) { failures++;state('error',{reason:'popup',failures});return; }
      if(!child){failures++;state('error',{reason:'popup',failures});return;}
      const p={nonce:token,child,ready:false,sent:false,payload:null,checksum:null};pending=p;arm(p);state('preparing');
      try {
        p.payload=api.encode(storage);
        const backup=decode(api,p.payload);p.summary=summary(api,backup);
        digest(w.crypto,logical(backup)).then(hash=>{if(pending===p){p.checksum=hash;send(p);}}).catch(()=>{if(pending===p)fail('backup');});
      } catch(_){fail('backup');}
    }
    return Object.freeze({start,dispose(){clear(pending);if(pending)pending.payload=null;pending=null;w.removeEventListener('message',receive);}});
  }
  function receiver(options) {
    const {w,storage,api,config,token}=options;
    const state=options.onState || (()=>{});
    const opener=w.opener;
    let active=NONCE.test(token) && !!opener, processing=false, done=false, failures=0, timer, heartbeat;
    function stopTimers(){w.clearTimeout(timer);w.clearInterval(heartbeat);}
    function post(type, extra={}) {if(!opener)return;try{opener.postMessage({type,version:VERSION,nonce:token,...extra},config.legacyOrigin);}catch(_){}}
    function fail(reason) {stopTimers();processing=false;failures++;state('error',{reason,failures});post('TRANSFER_ERROR');}
    function begin() {
      if(done||processing)return;
      if(!opener || !NONCE.test(token)){fail('opener');return;}
      active=true;stopTimers();state('waiting');post('READY');
      heartbeat=w.setInterval(()=>{if(active&&!processing&&!done)post('READY');},1500);
      timer=w.setTimeout(()=>{active=false;fail('timeout');},120000);
    }
    async function importPayload(d) {
      let snapshot=null, wrote=false;
      try {
        const incoming=decode(api,d.payload), expected=logical(incoming), keys=Object.keys(incoming.data);
        const wantedSummary=summary(api,incoming);
        const wantedDigest=await digest(w.crypto,expected);
        if(!active||done)throw Error('Trasferimento scaduto.');
        if(wantedDigest!==d.checksum || !sameSummary(d.summary,wantedSummary))throw Error('Verifica del backup non riuscita.');
        // The existing journal refuses writes when an earlier restore is interrupted.
        snapshot=decode(api,api.encode(storage));
        // Record absence explicitly, including optional fields, for an exact rollback.
        for(const key of api.KEYS)if(!own(snapshot.data,key))snapshot.data[key]=null;
        api.decode(JSON.stringify(snapshot));
        api.restore(storage,incoming,true);wrote=true;
        const actual=decode(api,api.encode(storage));
        if(logical(actual,keys)!==expected || !sameSummary(summary(api,actual),wantedSummary))throw Error('Dati importati non corrispondenti.');
        const actualDigest=await digest(w.crypto,logical(actual,keys));
        if(!active || actualDigest!==wantedDigest || logical(decode(api,api.encode(storage)),keys)!==expected)throw Error('Verifica finale non riuscita.');
        done=true;active=false;stopTimers();
        try {w.history.replaceState(null,'',w.location.pathname+w.location.search);}catch(_){/* No payload is ever present in this URL. */}
        post('TRANSFER_SUCCESS',{status:'PASS',checksum:actualDigest,summary:wantedSummary});
        try{w.opener=null;}catch(_){}
        state('success',{checksum:actualDigest,summary:wantedSummary});
      } catch(_) {
        if(wrote && snapshot) {
          try {
            api.restore(storage,snapshot,true);
            const restored=decode(api,api.encode(storage));
            for(const key of api.KEYS)if(!own(restored.data,key))restored.data[key]=null;
            if(logical(restored)!==logical(snapshot))throw Error('Rollback non verificato.');
          } catch(_) {
            // Preserve a recovery journal for the ORIGINAL snapshot, never a partial import.
            try {
              const physical=Object.fromEntries(api.KEYS.map(key=>[key==='doterra_app_messages_read_v1'?key:'flutter.'+key,snapshot.data[key]===null?null:key==='doterra_app_messages_read_v1'?snapshot.data[key]:JSON.stringify(snapshot.data[key])]));
              storage.setItem(JOURNAL,JSON.stringify(physical));
            } catch(_) {}
            active=false;fail('recovery');return;
          }
        }
        fail('import');
      }
    }
    function receive(event) {
      if(!active||processing||done||!envelope(event,config.legacyOrigin,opener,token)||event.data.type!=='TRANSFER_PAYLOAD')return;
      processing=true;stopTimers();state('importing');
      const work=()=>importPayload(event.data);
      if(w.navigator?.locks?.request) {
        w.navigator.locks.request('dotapp-migration-v2',{ifAvailable:true},lock=>{if(!lock){fail('busy');return;}return work();}).catch(()=>fail('import'));
      } else work();
    }
    w.addEventListener('message',receive);
    return Object.freeze({begin,dispose(){active=false;stopTimers();w.removeEventListener('message',receive);}});
  }
  return Object.freeze({source,receiver,nonce,digest,logical,decode,summary,NONCE,COMPLETED});
});
