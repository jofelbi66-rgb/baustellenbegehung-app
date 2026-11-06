import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || '/tmp/baustellen-qa/node_modules/playwright/index.mjs');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const host=process.env.ISOLATION_TEST_HOST || 'http://127.0.0.1:5187';
const prodPath='/baustellenbegehung-app/',testPath='/baustellenbegehung-test/site/';
const saved=p=>p.getByRole('status').filter({hasText:'Auf diesem Gerät gespeichert'}).waitFor();
const rows=(p,name)=>p.evaluate(async name=>{const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return new Promise(resolve=>{const r=db.transaction('drafts').objectStore('drafts').getAll();r.onsuccess=()=>{db.close();resolve(r.result);};});},name);
const active=async(p,path)=>(await rows(p,'baustellenbegehung-drafts:'+path)).find(r=>r.id==='active');
try {
 const context=await browser.newContext();let requests=0;await context.route('https://script.google.com/**',r=>{requests++;return r.abort();});
 const initial=await context.newPage();await initial.goto(host+testPath);await saved(initial);const fixture=(await active(initial,testPath)).data;await initial.close();
 const seed=await context.newPage();await seed.goto(host+'/seed.html');
 const seeded=await seed.evaluate(async({fixture,testPath})=>{
   function png(y){const c=document.createElement('canvas');c.width=200;c.height=80;const ctx=c.getContext('2d');ctx.beginPath();ctx.moveTo(10,y);ctx.lineTo(150,y);ctx.stroke();return c.toDataURL();}
   const personal=png(20),testSignature=png(50);
   localStorage.setItem('app.inspectorName',JSON.stringify('Stammname TEST'));localStorage.setItem('app.ccEmail','office@example.invalid');localStorage.setItem('app.logoChoice','hagn');localStorage.setItem('app.logoSrc','/baustellenbegehung-app/hagn-logo.png');
   localStorage.setItem('app.signature_v1',JSON.stringify(personal));localStorage.setItem('app.signatureCapturedAt_v1',JSON.stringify('Alter persönlicher Zeitpunkt TEST'));
   await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase('baustellenbegehung-drafts:'+testPath);r.onsuccess=resolve;r.onerror=reject;});
   const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('baustellenbegehung-drafts',1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
   const data={...fixture,version:2,form:{...fixture.form,project:'ALTER TESTENTWURF',inspector:'Testperson ALT'},ccEmail:'test@example.invalid',signatureDataURL:testSignature,signatureCapturedAt:'Testzeitpunkt',dispatch:{state:'draft'}};
   const archive={id:'archive:legacy-preserved',revision:7,data};
   await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put({id:'active',revision:99,data});tx.objectStore('drafts').put(archive);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});db.close();return {personal,testSignature,archive,id:data.begehungsId};
 },{fixture,testPath});
 const prod=await context.newPage();await prod.goto(host+prodPath);await saved(prod);const prodRecord=await active(prod,prodPath);
 assert.equal(prodRecord.data.form.project,'');assert.notEqual(prodRecord.data.begehungsId,seeded.id);assert.equal(prodRecord.data.signatureDataURL,seeded.personal);assert.equal(prodRecord.data.signatureCapturedAt,'Alter persönlicher Zeitpunkt TEST');assert.equal(prodRecord.data.form.inspector,'Stammname TEST');assert.equal(prodRecord.data.ccEmail,'office@example.invalid');assert.equal((await rows(prod,'baustellenbegehung-drafts:'+prodPath)).length,1);
 const test=await context.newPage();await test.goto(host+testPath);await saved(test);const testRecord=await active(test,testPath);assert.equal(testRecord.data.form.project,'ALTER TESTENTWURF');assert.equal(testRecord.data.begehungsId,seeded.id);assert.equal(testRecord.data.version,3);assert.equal(testRecord.data.signatureDataURL,seeded.testSignature);assert.deepEqual((await rows(test,'baustellenbegehung-drafts:'+testPath)).find(r=>r.id===seeded.archive.id),seeded.archive);
 assert.equal((await rows(seed,'baustellenbegehung-drafts')).find(r=>r.id==='active').data.version,2);
 await test.getByPlaceholder('z.B. Schleusenmodernisierung XY').fill('NEUER TESTSTAND');await test.getByPlaceholder('z.B. joachim@firma.de').fill('changed-test@example.invalid');await saved(test);
 await prod.reload();await saved(prod);assert.equal(await prod.getByPlaceholder('z.B. Schleusenmodernisierung XY').inputValue(),'');assert.equal(await prod.getByPlaceholder('z.B. joachim@firma.de').inputValue(),'office@example.invalid');assert.equal((await active(prod,prodPath)).data.signatureDataURL,seeded.personal);
 await test.reload();await saved(test);assert.equal(await test.getByPlaceholder('z.B. Schleusenmodernisierung XY').inputValue(),'NEUER TESTSTAND');assert.equal(await test.getByPlaceholder('z.B. joachim@firma.de').inputValue(),'changed-test@example.invalid');
 await prod.getByRole('button',{name:'Löschen',exact:true}).click();await prod.waitForFunction(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('baustellenbegehung-drafts:/baustellenbegehung-app/',1);r.onsuccess=()=>resolve(r.result);});return new Promise(resolve=>{const r=db.transaction('drafts').objectStore('drafts').get('active');r.onsuccess=()=>{db.close();resolve(r.result.data.signatureDataURL==='');};});});
 await prod.reload();await saved(prod);assert.equal((await active(prod,prodPath)).data.signatureDataURL,'');await prod.waitForFunction(()=>{const c=document.querySelector('canvas');return !c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);});assert.equal((await active(test,testPath)).data.signatureDataURL,seeded.testSignature);
 assert.equal(await seed.evaluate(()=>JSON.parse(localStorage.getItem('app.signature_v1'))),seeded.personal);assert.equal(await seed.evaluate(()=>localStorage.getItem('app.ccEmail')),'office@example.invalid');test.once('dialog',d=>d.accept());await test.getByRole('button',{name:'Neue Begehung',exact:true}).click();await test.waitForFunction(()=>document.querySelector('input[placeholder="z.B. Schleusenmodernisierung XY"]').value==='');await saved(test);assert.equal((await active(test,testPath)).data.form.inspector,'Testperson ALT');assert.equal(requests,0);
 console.log('PASS: same host, separate app-path DBs/preferences; production ignores legacy test draft, imports prior personal signature; test copies active+archive without deleting originals; later edits stay separate; clear survives reload');
 await context.close();
} finally {await browser.close();}
