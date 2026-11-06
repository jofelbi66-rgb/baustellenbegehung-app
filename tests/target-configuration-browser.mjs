import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || '/tmp/baustellen-qa/node_modules/playwright/index.mjs');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try {
 const p=await browser.newPage();let requests=0;
 await p.route('https://script.google.com/**',r=>{requests++;return r.abort();});
 await p.goto(process.env.UNCONFIGURED_APP_URL || 'http://127.0.0.1:5186/');
 const saved=()=>p.getByRole('status').filter({hasText:'Auf diesem Gerät gespeichert'}).waitFor();
 await saved();await p.getByRole('alert').filter({hasText:'Kein gültiges Versandziel konfiguriert'}).waitFor();
 await p.getByPlaceholder('z.B. Schleusenmodernisierung XY').fill('Konfiguration TEST');await p.getByPlaceholder('Adresse oder automatisch ermitteln').fill('Testort');await p.getByLabel('Begehende Person *',{exact:false}).fill('Testperson');await saved();
 assert.equal(await p.getByRole('button',{name:'Begehung per E-Mail senden',exact:true}).isDisabled(),true);
 await p.evaluate(()=>document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(requests,0);
 const download=p.waitForEvent('download');await p.getByRole('button',{name:'PDF herunterladen (ohne Versand)',exact:true}).click();assert.ok((await download).suggestedFilename().endsWith('.pdf'));
 await p.reload();await saved();assert.equal(await p.getByPlaceholder('z.B. Schleusenmodernisierung XY').inputValue(),'Konfiguration TEST');assert.equal(requests,0);
 console.log('PASS: no configured target — visible warning, click and synthetic submit blocked, no request; local data and PDF download still available');
} finally {await browser.close();}
