import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/tmp/baustellen-qa/node_modules/playwright/index.mjs');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const url=process.env.REGISTER_TEST_URL || 'http://127.0.0.1:5173/baustellenbegehung-app/';
const expectedEndpoint=process.env.EXPECTED_APPS_SCRIPT_URL || 'https://script.google.com/macros/s/TEST-NO-REAL-SERVICE/exec';
const saved=p=>p.getByRole('status').filter({hasText:'Auf diesem Gerät gespeichert'}).waitFor();
const active=p=>p.evaluate(async()=>{
 const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('baustellenbegehung-drafts',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 return new Promise((resolve,reject)=>{const tx=db.transaction('drafts');const r=tx.objectStore('drafts').get('active');tx.oncomplete=()=>{db.close();resolve(r.result);};tx.onabort=()=>reject(tx.error);});
});
async function fresh(){const c=await browser.newContext();const p=await c.newPage();await p.goto(url);await saved(p);return {c,p};}
async function fill(p){await p.getByPlaceholder('z.B. Schleusenmodernisierung XY').fill('Register TEST');await p.getByPlaceholder('Adresse oder automatisch ermitteln').fill('Testort');await p.getByLabel('Begehende Person *',{exact:false}).fill('Testperson');await saved(p);}
const submit=p=>p.getByRole('button',{name:'Begehung per E-Mail senden',exact:true}).click();
async function retry(p){p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Unveränderten Versand prüfen / erneut anfragen',exact:true}).click();}
try {
 {const {c,p}=await fresh();await fill(p);
 const id=(await active(p)).data.begehungsId;
 await p.reload();await saved(p);assert.equal((await active(p)).data.begehungsId,id);
 await p.getByRole('button',{name:/Ordnung & Sauberkeit/}).click();
 await p.getByRole('button',{name:'Mangel',exact:true}).nth(0).click();await p.getByPlaceholder('Notiz…').nth(0).fill('Repair TEST');
 await p.getByRole('button',{name:'Notiz',exact:true}).nth(1).click();await p.getByRole('button',{name:'OK',exact:true}).nth(2).click();await saved(p);
 let requests=0,mails=0;const records=new Map();let frozen;
 await p.route('https://script.google.com/**',async r=>{
   assert.equal(r.request().url(),expectedEndpoint);
   requests++;const body=r.request().postData();const params=new URLSearchParams(body);const key=params.get('begehungsId');
   assert.equal(key,id);assert.equal(params.get('anzahlBewertet'),'3');assert.equal(params.get('gesellschaft'),'felbermayr');
   const findings=JSON.parse(params.get('feststellungen'));assert.equal(findings.length,2);assert.equal(findings[0].bewertung,'Mangel');assert.equal(findings[1].bewertung,'Notiz');assert.equal(findings[0].pruefpunktId,'ordnung-1');
   assert.ok(Buffer.from(params.get('pdfBase64'),'base64').toString('latin1').startsWith('%PDF-'));
   assert.equal((await active(p)).data.dispatch.state,'pending','request must follow a durable checkpoint');
   if(!records.has(key)){records.set(key,body);mails++;frozen=body;await r.abort('failed');}
   else {assert.equal(body,frozen,'retry must preserve exact PDF and fields');await r.fulfill({status:200,body:'OK'});}
 });
 await submit(p);await p.getByText('Versand nicht vollständig bestätigt.',{exact:false}).waitFor();
 assert.equal((await active(p)).data.dispatch.state,'pending');assert.equal(await p.getByPlaceholder('z.B. Schleusenmodernisierung XY').isDisabled(),true);assert.equal(await p.getByRole('button',{name:'Neue Begehung',exact:true}).isDisabled(),true);
 await p.reload();await saved(p);assert.equal((await active(p)).data.begehungsId,id);
 await retry(p);await p.getByText('Versand vom Server bestätigt.',{exact:true}).waitFor();assert.equal(requests,2);assert.equal(mails,1);assert.equal((await active(p)).data.dispatch.state,'sent');
 await p.reload();await saved(p);assert.equal(await p.getByRole('button',{name:'Begehung per E-Mail senden',exact:true}).isDisabled(),true);
 assert.equal(await p.getByPlaceholder('z.B. Schleusenmodernisierung XY').isDisabled(),true);
 p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Neue Begehung',exact:true}).click();await p.waitForFunction(()=>document.querySelector('input[placeholder="z.B. Schleusenmodernisierung XY"]').value==='');await saved(p);
 assert.notEqual((await active(p)).data.begehungsId,id);assert.equal((await active(p)).data.dispatch.state,'draft');
 console.log('PASS: stable ID, full pilot register payload/PDF, durable pending, lost response, exact retry, one simulated mail, sent lock and new ID only on new inspection');await c.close();}
 {const {c,p}=await fresh();await fill(p);let requests=0;
 await p.route('https://script.google.com/**',async r=>{requests++;if(requests===1)return r.abort('failed');assert.ok(r.request().url().includes('/SAVED-TARGET/exec'));return r.fulfill({status:200,body:'OK'});});
 await submit(p);await p.getByText('Versand nicht vollständig bestätigt.',{exact:false}).waitFor();
 await p.evaluate(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('baustellenbegehung-drafts',1);r.onsuccess=()=>resolve(r.result);});await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');const store=tx.objectStore('drafts');const r=store.get('active');r.onsuccess=()=>{const value=r.result;value.data.dispatch.endpoint='https://script.google.com/macros/s/SAVED-TARGET/exec';store.put(value);};tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});db.close();});
 await p.reload();await saved(p);assert.equal(await p.getByRole('button',{name:'Unveränderten Versand prüfen / erneut anfragen',exact:true}).isDisabled(),true);assert.equal(requests,1);assert.equal((await active(p)).data.dispatch.endpoint,'https://script.google.com/macros/s/SAVED-TARGET/exec');
 console.log('PASS: pending request for a different backend remains preserved and blocked, never silently redirected');await c.close();}
 {const {c,p}=await fresh();await fill(p);let requests=0;
 await p.route('https://script.google.com/**',async r=>{requests++;await r.fulfill({status:200,body:'OK'});});
 await p.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,...rest){if(value.data?.dispatch?.state==='pending')throw new DOMException('full','QuotaExceededError');return put.call(this,value,...rest);};});
 await submit(p);await p.getByRole('alert').filter({hasText:'Gerätespeicher ist voll'}).waitFor();assert.equal(requests,0);assert.equal((await active(p)).data.dispatch.state,'draft');
 console.log('PASS: storage failure before pending checkpoint prevents any network request');await c.close();}
 {const {c,p}=await fresh();await fill(p);let requests=0,mails=0;const ids=new Set();let body;
 await p.route('https://script.google.com/**',async r=>{requests++;const next=r.request().postData();const id=new URLSearchParams(next).get('begehungsId');if(!ids.has(id)){ids.add(id);mails++;body=next;await p.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,...rest){if(v.data?.dispatch?.state==='sent')throw new DOMException('full','QuotaExceededError');return put.call(this,v,...rest);};});}else assert.equal(next,body);await r.fulfill({status:200,body:'OK'});});
 await submit(p);await p.getByRole('alert').filter({hasText:'Gerätespeicher ist voll'}).waitFor();assert.equal((await active(p)).data.dispatch.state,'pending');
 await p.reload();await saved(p);await retry(p);await p.getByText('Versand vom Server bestätigt.',{exact:true}).waitFor();assert.equal(requests,2);assert.equal(mails,1);
 console.log('PASS: local receipt failure after simulated mail survives reload and retries same ID/payload without second mail');await c.close();}
 {const {c,p}=await fresh();await fill(p);const other=await c.newPage();await other.goto(url);await saved(other);let requests=0;let finish;
 await c.route('https://script.google.com/**',async r=>{requests++;await new Promise(resolve=>finish=resolve);await r.fulfill({status:200,body:'OK'});});
 await submit(p);await p.waitForFunction(()=>document.body.textContent.includes('Versand wird verarbeitet'));
 await submit(other);await other.getByRole('alert').filter({hasText:'anderer Tab'}).waitFor();assert.equal(requests,1);finish();await p.getByText('Versand vom Server bestätigt.',{exact:true}).waitFor();
 console.log('PASS: competing tab cannot transmit after stale-revision checkpoint failure');await c.close();}
 {const {c,p}=await fresh();await fill(p);const original=(await active(p)).data;
 await p.evaluate(async data=>{const db=await new Promise(resolve=>{const r=indexedDB.open('baustellenbegehung-drafts',1);r.onsuccess=()=>resolve(r.result);});const {begehungsId,dispatch,...legacy}=data;await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put({id:'active',revision:100,data:{...legacy,version:1}});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});db.close();},original);
 await p.reload();await saved(p);const migrated=(await active(p)).data;assert.equal(migrated.version,2);assert.equal(migrated.dispatch.state,'unverified');assert.equal(migrated.form.project,original.form.project);assert.ok(migrated.begehungsId);assert.equal(await p.getByRole('button',{name:'Begehung per E-Mail senden',exact:true}).isDisabled(),true);
 await p.reload();await saved(p);assert.equal((await active(p)).data.begehungsId,migrated.begehungsId);
 p.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:'Noch nicht versendet – bestätigen',exact:true}).click();assert.equal((await active(p)).data.dispatch.state,'unverified');
 p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Noch nicht versendet – bestätigen',exact:true}).click();await saved(p);await p.waitForFunction(()=>!document.body.textContent.includes('Älterer Entwurf:'));
 assert.equal((await active(p)).data.dispatch.state,'draft');assert.equal((await active(p)).data.begehungsId,migrated.begehungsId);
 console.log('PASS: legacy draft preserved and migrated once; unknown send history requires explicit confirmation');await c.close();}
 {const {c,p}=await fresh();await fill(p);let requests=0;
 await p.route('https://script.google.com/**',r=>{requests++;return r.fulfill({status:200,body:'ERROR: Versandstatus unklar oder in Bearbeitung; manuelle Prüfung erforderlich.'});});
 await submit(p);await p.getByText('Versand nicht vollständig bestätigt.',{exact:false}).waitFor();assert.equal((await active(p)).data.dispatch.state,'pending');assert.equal(requests,1);assert.equal(await p.getByPlaceholder('z.B. Schleusenmodernisierung XY').isDisabled(),true);
 console.log('PASS: backend uncertainty is not shown as success and does not unlock mutable send data');await c.close();}
} finally {await browser.close();}
