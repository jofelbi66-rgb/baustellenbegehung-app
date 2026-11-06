import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parse } from '@babel/parser';
import gen from '@babel/generator';
// Golden reference: original production main 5f59c82, normalized without comments/whitespace.
const baseline = {
  "PDF_BODY": "f6537b2c3af591f6ddb4a98bea7a197f4674134ca6c58353b4b87fc8cbdc92f7",
  "addPhotosSection": "f3fbee0b04dd703f7664bd7644dfe44657abc1b86ae84024b7c5e9c2828f4ffa",
  "addLogoTopRight": "632ad32e284a685021fc9d8961a68daad09f31cc0758852e1782080ef9acd197",
  "toDataUrl": "b3bc2fd625322abae398b8e6448af6aa36ac45a62723ef4d6babccc57bc690aa",
  "buildChecklistRows": "124d980b9de4c0d8f1b62bdaab608c48a97b3f1286405e00389578433f15ff91",
  "drawFooter": "01808c860ee4e25363ee394f9810aa06da642a35fc702ace038a3fb86cc2d8b7",
  "formatDEDateTime": "baeea30dc5686548fac04f6f730157e7a24bfcbb126c354bf43038d50eb2227c",
  "CATEGORIES": "b70e2859b537e313361e5403a4894ac3ffa76d62274b29ca6b92ef20c44de8db",
  "GENERAL_EXTRA_CATEGORIES": "0ef83aeaf3ad4b7a0e881536e9bd95dcf7e67db82559faec3b02ab46b52f3132",
  "MOBILKRAN_CATEGORIES": "70d3d56efd19a648dca3dc65ed706ec746f11057584f3177fffc8695e2c644f8",
  "BAU_CATEGORIES": "db2b897e43ce6b90f07f828b25ca72a509647dbc9bfee70c03e547d0205bd7b8",
  "MONTAGE_CATEGORIES": "74c2b8053126bba889af25fcd8644a4ed5a4f474ba688083f7eb0224cc571505"
};
const source = await readFile(new URL('../src/Baustellenbegehung.jsx', import.meta.url), 'utf8');
const ast = parse(source, {sourceType:'module',plugins:['jsx']});
const component = ast.program.body.find(node => node.type === 'ExportDefaultDeclaration').declaration.body.body;
const find = name => [...ast.program.body,...component].flatMap(node => node.type === 'VariableDeclaration' ? node.declarations : [node]).find(node => node.id?.name === name);
const generate = gen.default || gen;
const hash = node => createHash('sha256').update(generate(node,{comments:false,compact:true}).code).digest('hex');
const reportBody = find('createReportPdf').init.body.body.slice(0,-1); // Separate return replaces original inline send flow.
assert.equal(hash({type:'Program',body:reportBody,sourceType:'module'}),baseline.PDF_BODY,'PDF composition must match existing production report');
for (const name of Object.keys(baseline).filter(name => name !== 'PDF_BODY')) assert.equal(hash(find(name)),baseline[name],name+' must match existing production code');
console.log('PASS: PDF composition, photo layout, table/footer/logo helpers, dates and all five checklists match original production code after normalization');
