import {extractLibraryFile} from './library-extract.mjs';
try{
 const result=await extractLibraryFile(process.argv[2],process.argv[3]);
 process.send({ok:true,result},()=>process.exit(0));
}catch(error){
 process.send({ok:false,error:error.message||'文档解析失败。'},()=>process.exit(0));
}
