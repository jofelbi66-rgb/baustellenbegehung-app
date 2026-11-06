import assert from 'node:assert/strict';
import { test } from 'node:test';
import { postInspection } from '../src/mailTransport.js';

test('transport keeps the prepared ID/payload and accepts only exact OK (trimmed)', async () => {
  const original=globalThis.fetch;
  try {
    let calls=0;
    globalThis.fetch=async (url, options)=>{
      calls++;
      assert.equal(url,'https://example.invalid/mock');
      assert.equal(options.method,'POST');
      assert.equal(options.body.get('begehungsId'),'same-id');
      assert.equal(options.body.get('pdfBase64'),'frozen-pdf');
      assert.ok(options.signal);
      return {ok:true,text:async()=>' OK\n'};
    };
    await postInspection('https://example.invalid/mock',{begehungsId:'same-id',pdfBase64:'frozen-pdf'});
    assert.equal(calls,1);
    for(const response of [{ok:true,text:async()=>'ERROR: manual review'},{ok:true,text:async()=>'<html>Login</html>'},{ok:false,text:async()=>'OK'}]) {
      globalThis.fetch=async()=>response;
      await assert.rejects(postInspection('https://example.invalid/mock',{}),/nicht bestätigt/);
    }
  } finally {globalThis.fetch=original;}
});
test('network failure is reported without an automatic second request', async () => {
  const original=globalThis.fetch;let calls=0;
  try {
    globalThis.fetch=async()=>{calls++;throw new Error('simulated lost response');};
    await assert.rejects(postInspection('https://example.invalid/mock',{}),/lost response/);
    assert.equal(calls,1);
  } finally {globalThis.fetch=original;}
});
