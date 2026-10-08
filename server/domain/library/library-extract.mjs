import {readFile} from 'node:fs/promises';
export const textExtensions=new Set(['.txt','.md','.markdown','.csv','.json','.ts','.tsx','.js','.jsx','.py','.java','.c','.cpp','.h','.html','.css','.sql','.yaml','.yml','.tex']);
export function readableText(text){
 if(typeof text!=='string')throw new Error('解析器没有返回正文。');
 if(/[\u0000-\u0008\u000b\u000e-\u001f\u007f]/.test(text))throw new Error('内容包含二进制控制字符，未作为正文入库；请转换为可读文本后重试。');
 return text;
}
export function decodeLibraryText(bytes){
 let text,encoding='utf-8',notice='';
 if(bytes.length>=4&&((bytes[0]===0xff&&bytes[1]===0xfe&&bytes[2]===0&&bytes[3]===0)||(bytes[0]===0&&bytes[1]===0&&bytes[2]===0xfe&&bytes[3]===0xff)))throw new Error('暂不解析UTF-32文本，请转换为UTF-8；原始副本已保留。');
 if(bytes[0]===0xff&&bytes[1]===0xfe)encoding='utf-16le';
 else if(bytes[0]===0xfe&&bytes[1]===0xff)encoding='utf-16be';
 try{text=new TextDecoder(encoding,{fatal:true}).decode(bytes);}
 catch{
  if(encoding!=='utf-8')throw new Error('文本编码内容不完整，无法按字节标记解码；请检查原文件。');
  try{text=new TextDecoder('gb18030',{fatal:true}).decode(bytes);encoding='gb18030';notice='UTF-8解码失败，已尝试按GB18030读取；编码为推断，请核对文字。';}
  catch{throw new Error('无法完整解码文本，请转换为UTF-8后重试；原始副本已保留。');}
 }
 readableText(text);
 if(text.includes('\ufffd'))notice=[notice,'正文自身含有替换字符（�），可能在保存前已经丢失文字，请核对原件。'].filter(Boolean).join(' ');
 return {text,encoding,notice};
}
export async function extractLibraryFile(file,extension){
 let text='',metadata={};
 if(textExtensions.has(extension)){const decoded=decodeLibraryText(await readFile(file));text=decoded.text;metadata={encoding:decoded.encoding,notice:decoded.notice};}
 else if(extension==='.docx'){
  const mammoth=await import('mammoth'),result=await mammoth.default.extractRawText({path:file});text=readableText(result.value);
  metadata={notice:result.messages?.length?'文档解析器返回提示，请对照原件检查提取内容。':''};
 }else if(extension==='.pdf'){
  const {PDFParse}=await import('pdf-parse'),parser=new PDFParse({data:new Uint8Array(await readFile(file))});
  try{const result=await parser.getText({pageJoiner:''});text=readableText(result.text);metadata={pages:result.total};}finally{await parser.destroy();}
 }else return {content:'',parse:{state:'unsupported',notice:'副本已保存，此格式尚未自动解析正文。'}};
 return {content:text,parse:{state:text.trim()?'ready':'empty',...metadata,...(!text.trim()?{notice:extension==='.pdf'?'未提取到文字层；可能为空白或扫描PDF，原件仍可下载。':'没有提取到可用正文，原件仍可下载。'}:{})}};
}
