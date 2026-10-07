import {existsSync} from 'node:fs';
if(existsSync('.env.local'))process.loadEnvFile('.env.local');
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {websiteMiddleware} from './website.mjs';
const root=resolve('dist');const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'};
createServer((req,res)=>websiteMiddleware(req,res,async()=>{try{let path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!path.startsWith(root+'/')&&path!==root){res.statusCode=403;res.end();return}if(path===root||path.endsWith('/'))path=resolve(root,'index.html');const data=await readFile(path);res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(data)}catch{res.statusCode=404;res.end('Not found')}})).listen(Number(process.env.PORT)||8787,'127.0.0.1',()=>console.log('Demo studio: http://127.0.0.1:'+(process.env.PORT||8787)));
