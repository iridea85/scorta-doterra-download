// Private preview: assistance and protected Admin entry only.
(() => {
  const version = 'v27';
  function genericDevice() {
    const ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return /Chrome|CriOS/i.test(ua) ? 'Android · Chrome' : 'Android · altro browser';
    if (/iPhone|iPad|iPod/i.test(ua)) return /Safari/i.test(ua) ? 'iOS · Safari' : 'iOS · altro browser';
    if (/Firefox/i.test(ua)) return 'Desktop · Firefox';
    if (/Chrome/i.test(ua)) return 'Desktop · Chrome';
    if (/Safari/i.test(ua)) return 'Desktop · Safari';
    return 'Altro dispositivo';
  }

  function showPanel() {
    if (document.querySelector('#scorta-settings-panel')) return;
    const shade = document.createElement('div');
    shade.id = 'scorta-settings-panel';
    shade.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#22152988;display:grid;place-items:center;padding:16px;font:16px system-ui,sans-serif';
    shade.innerHTML = `<section role="dialog" aria-modal="true" aria-label="Impostazioni dōtapp" style="background:white;color:#302637;border-radius:18px;max-width:460px;width:100%;max-height:90vh;overflow:auto;padding:22px;box-shadow:0 18px 45px #0003">
      <header style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;font-size:22px">Impostazioni</h2><button type="button" data-close aria-label="Chiudi" style="border:0;background:none;font-size:26px;color:#6e5578">×</button></header>
      <div style="margin-top:18px"><button type="button" data-backup style="font:inherit;font-weight:600;border:1px solid #d8c9de;background:white;color:#60476b;border-radius:10px;padding:12px;width:100%">BACKUP E TRASFERIMENTO DATI</button></div>
      <div style="margin-top:18px"><button type="button" data-nav-order style="font:inherit;font-weight:700;border:1px solid #d8c9de;background:white;color:#60476b;border-radius:10px;padding:12px 14px;width:100%">ORDINE MENU INFERIORE</button></div>
      <div style="margin-top:18px"><button type="button" data-messages style="font:inherit;border:1px solid #d8c9de;background:white;color:#60476b;border-radius:10px;padding:11px 14px;width:100%">Messaggi App</button></div>
      <div style="border-top:1px solid #e8dfeb;margin-top:18px;padding-top:16px"><strong>SEGNALA UN PROBLEMA</strong><form data-report style="display:grid;gap:12px;margin-top:12px"><label>Categoria<select required name="category" style="display:block;width:100%;padding:10px;margin-top:5px"><option>Funzionamento</option><option>Catalogo</option><option>Altro</option></select></label><label>Descrizione<textarea required minlength="10" maxlength="2000" name="description" style="display:block;width:100%;min-height:90px;padding:10px;margin-top:5px"></textarea></label><button type="submit" style="background:#6e5578;color:white;border:0;border-radius:10px;padding:12px 18px;font:inherit">Invia segnalazione</button></form></div>
      <div style="border-top:1px solid #e8dfeb;margin-top:20px;padding-top:16px"><button type="button" data-admin style="font:inherit;font-size:14px;color:#6e5578;border:0;background:none;padding:0;text-decoration:underline;text-underline-offset:3px">AREA ADMIN</button></div>
      <section data-support aria-labelledby="scorta-support-title" style="border:1px solid #e8dfeb;border-radius:12px;margin-top:18px;padding:14px;background:#faf8fb">
        <h3 id="scorta-support-title" style="margin:0;font-size:16px;font-weight:600">❤️ Sostieni dōtapp</h3>
        <p style="margin:8px 0;font-size:14px;line-height:1.5">Se l’app ti è utile e vuoi contribuire volontariamente al suo mantenimento, puoi offrire un piccolo supporto.</p>
        <p style="margin:0 0 10px;font-size:13px;line-height:1.5;color:#60476b">È facoltativo: l’app resta utilizzabile senza contribuire. Nessun abbonamento, nessuna funzione premium e nessun importo obbligatorio.</p>
        <a href="https://revolut.me/irideaf" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;min-height:44px;box-sizing:border-box;padding:10px 14px;border:1px solid #d8c9de;border-radius:10px;background:white;color:#60476b;font-size:14px;font-weight:600;text-decoration:none">SOSTIENI L’APP</a>
      </section>
      <details data-app-info style="border-top:1px solid #e8dfeb;margin-top:20px;padding-top:16px">
        <summary style="cursor:pointer;min-height:44px;display:list-item;font-weight:600">Informazioni sull’app</summary>
        <h3 style="margin:8px 0">dōtapp</h3>
        <p style="font-size:14px;line-height:1.5">La tua scorta di oli, organizzata.</p>
        <p style="font-size:13px;line-height:1.5">Applicazione indipendente. Non affiliata a dōTERRA.</p>
        <h4 style="font-size:14px">INFORMAZIONI E MARCHI</h4>
        <p style="font-size:13px;line-height:1.6">dōtapp è un’applicazione indipendente e non è affiliata, sponsorizzata, approvata o sviluppata da dōTERRA o dalle sue società affiliate.</p>
        <p style="font-size:13px;line-height:1.6">dōTERRA® e i nomi dei prodotti eventualmente citati appartengono ai rispettivi titolari e vengono utilizzati esclusivamente per identificare i prodotti gestiti dall’utente nell’app.</p>
        <p style="font-size:13px;line-height:1.6">I contenuti personali inseriti nel Ricettario sono creati e gestiti dall’utente.</p>
      </details>
      <p data-status role="status" style="font-size:14px;color:#60476b;min-height:20px"></p></section>`;
    document.body.append(shade);
    window.dotappMigration?.mountSettings(shade);
    window.dotappInstallationIntro?.mountSettings(shade);
    window.dotappUpdates?.mountSettings(shade);
    const status = shade.querySelector('[data-status]');
    shade.querySelector('[data-backup]').onclick = () => window.dotappBackup?.open();
    shade.querySelector('[data-admin]').onclick = () => {
      if (!window.scortaOpenAdmin) { status.textContent = 'Attendi il caricamento dell’app e riprova.'; return; }
      shade.remove(); window.scortaOpenAdmin();
    };
    shade.querySelector('[data-nav-order]').onclick = () => {
      if (!window.scortaOpenNavSettings) { status.textContent = 'Attendi il caricamento dell’app e riprova.'; return; }
      shade.remove(); window.scortaOpenNavSettings();
    };
    shade.querySelector('[data-messages]').onclick = () => { shade.remove(); window.scortaOpenMessages?.(); };
    shade.querySelector('[data-close]').onclick = () => shade.remove();
    shade.addEventListener('click', event => { if (event.target === shade) shade.remove(); });
    shade.querySelector('[data-report]').onsubmit = async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const button = form.querySelector('button[type="submit"]');
      const data = new FormData(form);
      button.disabled = true;
      status.textContent = '';
      try {
        const response = await fetch('https://ozgpdglnycmmhilvsqsw.supabase.co/rest/v1/sd_reports', {
          method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json', apikey: 'sb_publishable_3VIXsCBHD6ugmcuBkZ4sqA_xuudgE60', Prefer: 'return=minimal' },
          body: JSON.stringify({ category: data.get('category'), description: data.get('description'), app_version: version, device_info: genericDevice() }),
        });
        const result = response.status === 201 || response.status === 204 ? {} : await response.json();
        if (!response.ok) throw new Error(result.message || result.error || 'Invio non riuscito');
        form.reset(); status.textContent = 'Segnalazione inviata.';
      } catch (error) { status.textContent = error.message || 'Invio non riuscito.'; }
      finally { button.disabled = false; }
    };
  }

  window.scortaOpenSettings = showPanel;
})();
