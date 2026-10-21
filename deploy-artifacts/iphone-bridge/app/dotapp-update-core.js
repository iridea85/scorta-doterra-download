/* Update coordinator: no personal storage writes, data migrations or automatic reloads. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.createDotappUpdater = factory;
})(typeof globalThis === 'object' ? globalThis : this, function createDotappUpdater(env) {
  'use strict';
  const {release, base, sw, fetch: get, session, isSafe, now, reload, notify, later, cancel} = env;
  const guard = 'dotapp_update_reload_v1:' + base;
  let registration, target, deferred = false, busy = false, intent = false, reloaded = false;
  let checked = -Infinity, pendingCheck, problem = '', phase = 'idle', changed = false;
  const watched = new WeakSet();
  function state() { return {release, target, available: !!target, deferred, busy, phase, problem, safe: isSafe(), reloaded}; }
  function publish() { notify(state()); }
  function offer(value) { if (value) { target = value; phase = 'available'; } publish(); }
  async function workerRelease(worker) { return worker ? env.workerRelease(worker) : null; }
  function watchWorker(worker) {
    if (!worker || watched.has(worker)) return;
    watched.add(worker);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && registration.active) offer(target || release);
      if (worker.state === 'activated') { changed = true; if (intent) finish(); }
      if (worker.state === 'redundant') { problem = 'Aggiornamento non completato. Riprova più tardi.'; publish(); }
    });
  }
  function bind(reg) {
    if (registration !== reg) {
      registration = reg;
      reg.addEventListener('updatefound', () => watchWorker(reg.installing));
    }
    watchWorker(reg.installing); watchWorker(reg.waiting);
    if (reg.waiting && reg.active) offer(target || release);
  }
  async function ensureRegistration() {
    if (!sw) throw Error('Aggiornamento non disponibile in questo browser.');
    let reg = await sw.getRegistration(base);
    if (!reg || reg.scope !== base) reg = await sw.register(new URL('flutter_service_worker.js', base).href, {scope: base, updateViaCache: 'none'});
    else reg = await sw.register(reg.active?.scriptURL || reg.waiting?.scriptURL || new URL('flutter_service_worker.js', base).href, {scope: base, updateViaCache: 'none'});
    if (reg.scope !== base) throw Error('Ambito aggiornamento inatteso.');
    bind(reg); return reg;
  }
  async function check(force = false) {
    if (pendingCheck) return pendingCheck;
    if (!force && now() - checked < 60000) return state();
    checked = now(); problem = '';
    pendingCheck = (async () => {
      try {
        // This filename is deliberately absent from historic Flutter RESOURCES lists.
        const url = new URL('dotapp-release.json', base); url.searchParams.set('_check', String(now()));
        const response = await get(url.href, {cache: 'no-store', credentials: 'same-origin', headers: {'Cache-Control': 'no-cache'}});
        if (!response.ok) throw Error('Connessione non disponibile. Riprova più tardi.');
        const remote = await response.json();
        if (!remote || typeof remote.release !== 'string' || !/^[a-zA-Z0-9._-]{1,100}$/.test(remote.release)) throw Error('Versione aggiornamento non valida.');
        if (remote.release !== release) offer(remote.release);
        const reg = await ensureRegistration();
        await reg.update(); watchWorker(reg.installing);
        if (reg.waiting && reg.active) offer(remote.release);
        if (!target) phase = 'current';
      } catch (error) { problem = error.message || 'Controllo non riuscito. Riprova più tardi.'; }
      finally { pendingCheck = null; publish(); }
      return state();
    })();
    return pendingCheck;
  }
  async function finish() {
    if (!intent || reloaded || !isSafe() || !changed) return;
    const active = sw?.controller;
    const activeRelease = await workerRelease(active);
    if (!intent || !isSafe() || activeRelease !== target) return;
    try {
      if (session.getItem(guard) === target) { intent = false; busy = false; phase = 'stopped'; problem = 'Aggiornamento non completato. Riprova più tardi.'; publish(); return; }
      session.setItem(guard, target);
    } catch (_) { intent = false; busy = false; problem = 'Aggiornamento rimandato. Riprova alla prossima apertura.'; publish(); return; }
    reloaded = true; phase = 'reloading'; publish(); reload();
  }
  async function apply() {
    if (busy || reloaded) return false;
    deferred = false;
    if (!isSafe()) { publish(); return false; }
    if (!target) await check(true);
    if (!target || !isSafe()) return false;
    busy = true; intent = true; changed = false; phase = 'updating'; problem = ''; publish();
    try {
      const reg = registration || await ensureRegistration();
      await reg.update(); watchWorker(reg.installing);
      if (reg.installing) await new Promise((resolve, reject) => {
        const worker = reg.installing;
        const timer = later(() => { worker.removeEventListener('statechange', inspect); reject(Error('Aggiornamento in preparazione. Riprova tra poco.')); }, 20000);
        function inspect() {
          if (['installed','activated','redundant'].includes(worker.state)) {
            cancel(timer); worker.removeEventListener('statechange', inspect);
            worker.state === 'redundant' ? reject(Error('Aggiornamento non completato. Riprova più tardi.')) : resolve();
          }
        }
        worker.addEventListener('statechange', inspect); inspect();
      });
      if (!isSafe()) { intent = false; busy = false; phase = 'available'; publish(); return false; }
      if (reg.waiting) reg.waiting.postMessage('skipWaiting');
      else if (await workerRelease(sw.controller) === target) { changed = true; await finish(); }
      else throw Error('Aggiornamento in preparazione. Riprova tra poco.');
      later(() => { if (busy && !reloaded) { intent = false; busy = false; phase = 'available'; problem = 'Aggiornamento rimandato. Riprova tra poco.'; publish(); } }, 20000);
      return true;
    } catch (error) { intent = false; busy = false; phase = 'available'; problem = error.message; publish(); return false; }
  }
  sw?.addEventListener('controllerchange', () => { changed = true; if (intent) finish(); else if (registration?.active) workerRelease(sw.controller).then(value => { if (value && value !== release) offer(value); }); });
  function resume() { deferred = false; check(); if (intent) finish(); else publish(); }
  function safePoint() { if (intent) finish(); publish(); }
  function postpone() { deferred = true; publish(); }
  function start() {
    try { if (session.getItem(guard) === release) { phase = 'updated'; session.removeItem(guard); } } catch (_) {}
    publish(); return check();
  }
  return Object.freeze({state, start, check, apply, postpone, resume, safePoint});
});
