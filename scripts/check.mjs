import {readdir, readFile} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {SourceTextModule} from 'node:vm';
async function walk(dir) {
  for (const item of await readdir(dir,{withFileTypes:true})) {
    const path=`${dir}/${item.name}`;
    if(item.isDirectory()) await walk(path);
    else if(/\.(m?js)$/.test(path)) {
      
      const code=await readFile(path,'utf8');
      new SourceTextModule(code,{identifier:path});
      for(const match of code.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))
        await readFile(resolve(dirname(path),match[1]));
    }
  }
}
await walk('src');
console.log('PASS: JavaScript syntax and every local static import resolve.');
