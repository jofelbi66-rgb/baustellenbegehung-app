import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || '/tmp/baustellen-qa/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const url = process.env.SIGNATURE_TEST_URL || 'http://127.0.0.1:5173/baustellenbegehung-app/';
const saved = page => page.getByRole('status').filter({ hasText: 'Auf diesem Gerät gespeichert' }).waitFor();
const ink = canvas => canvas.evaluate(c => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let first = 0, second = 0;
  for (let y=0;y<c.height;y++) for(let x=0;x<c.width;x++) {
    const i=(y*c.width+x)*4;
    if(d[i+3] && d[i]<100 && d[i+1]<100 && d[i+2]<100) {
      if(x<c.width/2) first++; else second++;
    }
  }
  return { first, second };
});
try {
  for (const touch of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: touch ? 3 : 1, isMobile: touch, hasTouch: touch });
    const page = await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url); await saved(page);
    const canvas=page.locator('canvas');await canvas.scrollIntoViewIfNeeded();
    const box=await canvas.boundingBox();
    const cdp=await context.newCDPSession(page);
    async function stroke(x,y) {
      if(touch) {
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
        for(let i=1;i<=6;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+i*3,y:y+i*2}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      } else {
        await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+18,y+12,{steps:6});await page.mouse.up();
        await page.mouse.move(box.x,box.y-10);
      }
      await saved(page);
      // Sample after restore image loads and any trailing pointerleave events.
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    }
    await stroke(box.x+box.width*0.2,box.y+box.height*0.3);
    assert.ok((await ink(canvas)).first>10,'first stroke must remain visible after release');
    await stroke(box.x+box.width*0.65,box.y+box.height*0.65);
    const drawn=await ink(canvas);
    assert.ok(drawn.first>10,'starting second stroke must retain first stroke');
    assert.ok(drawn.second>10,'second stroke must remain visible');
    await page.reload();await saved(page);
    await page.waitForFunction(()=>{const c=document.querySelector('canvas');const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return a.some((v,i)=>i%4===3&&v>0);});
    const restored=await ink(canvas);
    assert.ok(restored.first>10 && restored.second>10,'both strokes visibly restored after reload');
    await page.setViewportSize({width:430,height:844});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const resized=await ink(canvas);assert.ok(resized.first>10 && resized.second>10,'resize must retain ink');
    await page.getByRole('button',{name:'Löschen',exact:true}).click();await saved(page);
    assert.deepEqual(await ink(canvas),{first:0,second:0});
    await page.reload();await saved(page);assert.deepEqual(await ink(canvas),{first:0,second:0});
    assert.deepEqual(errors,[]);
    console.log(`PASS: ${touch?'touch, DPR 3':'mouse, DPR 1'} — visible strokes after release/leave, multiple strokes, reload, resize and deliberate clearing`);
    await context.close();
  }
} finally {await browser.close();}
