import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {decodeLibraryText} from '../server/domain/library/library-extract.mjs';
import {parseLibraryCopy as extractLibraryFile} from '../server/domain/library/library-parser.mjs';
const root=await mkdtemp(path.join(os.tmpdir(),'library-extract-'));
function pdf(stream){
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 let content='%PDF-1.4\n';const offsets=[0];objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(content));content+=`${i+1} 0 obj\n${object}\nendobj\n`;});
 const start=Buffer.byteLength(content);content+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');return content+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
}
test('BOM encodings preserve exact newlines and content; inferred GB18030 is explicit; binary/malformed bytes fail',()=>{
 const text='# 中文\r\n1. 标题\n尾部😀';assert.equal(decodeLibraryText(Buffer.from(text)).text,text);
 const le=Buffer.concat([Buffer.from([255,254]),Buffer.from(text,'utf16le')]);assert.equal(decodeLibraryText(le).text,text);
 const be=Buffer.from(le);be.swap16();assert.equal(decodeLibraryText(be).text,text);
 const gb=decodeLibraryText(Buffer.from([0xc4,0xe3,0xba,0xc3]));assert.equal(gb.text,'你好');assert.match(gb.notice,/推断/);
 assert.throws(()=>decodeLibraryText(Buffer.from([0xff,0xfe,0x41])),/不完整/);
 assert.throws(()=>decodeLibraryText(Buffer.from([0x41,0,0x42])),/二进制/);
 assert.throws(()=>decodeLibraryText(Buffer.from([0xff,0xfe,0,0])),/UTF-32/);
});
test('full text is retained and empty PDF page markers never count as parsed body',async()=>{
 const text='完整正文\n'.repeat(30000)+'文档最后事实';const file=path.join(root,'long.md');await writeFile(file,text);
 const parsed=await extractLibraryFile(file,'.md');assert.equal(parsed.content,text);assert.equal(parsed.parse.state,'ready');
 const empty=path.join(root,'blank.pdf');await writeFile(empty,pdf(''));
 const blank=await extractLibraryFile(empty,'.pdf');assert.equal(blank.content.trim(),'');assert.equal(blank.parse.state,'empty');assert.match(blank.parse.notice,/文字层/);
 const normal=path.join(root,'text.pdf');await writeFile(normal,pdf('BT /F1 12 Tf 50 700 Td (Real document text) Tj ET'));
 const result=await extractLibraryFile(normal,'.pdf');assert.match(result.content,/Real document text/);assert.ok(!result.content.includes('-- 1 of 1 --'));assert.equal(result.parse.state,'ready');
});
test('DOCX full body reaches the tail and unsupported copies have an explicit state',async()=>{
 const file=path.join(root,'long.docx'),text='document paragraph '.repeat(1000)+'TAIL_FACT';
 execFileSync('python3',['-c',"import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1],'w') as z:\n z.writestr('[Content_Types].xml','<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Override PartName=\"/word/document.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml\"/></Types>')\n z.writestr('word/document.xml',sys.stdin.read())",file],{input:'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>'+text+'</w:t></w:r></w:p></w:body></w:document>'});
 const parsed=await extractLibraryFile(file,'.docx');assert.ok(parsed.content.includes(text));assert.ok(parsed.content.indexOf('TAIL_FACT')>8000);
 assert.equal((await extractLibraryFile('unused','.zip')).parse.state,'unsupported');
});
after(async()=>rm(root,{recursive:true,force:true}));
