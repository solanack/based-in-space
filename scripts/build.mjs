import {cp,mkdir,rm,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await import('./check.mjs');
await rm('dist',{recursive:true,force:true});await mkdir('dist');
for(const path of ['index.html','manifest.webmanifest','src','vendor']) await cp(path,`dist/${path}`,{recursive:true});
const files=[];
async function walk(dir){for(const f of await readdir(dir,{withFileTypes:true})){const p=`${dir}/${f.name}`;if(f.isDirectory())await walk(p);else {const b=await readFile(p);files.push({path:p.slice(5),bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}}}
await walk('dist');await writeFile('dist/build-manifest.json',JSON.stringify({files},null,2));
console.log(`Static build: ${files.length} files, ${files.reduce((s,f)=>s+f.bytes,0)} bytes; no runtime CDN dependency.`);
