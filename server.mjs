import http from 'node:http';
import {readFile} from 'node:fs/promises';
const files = {'/':'index.html','/app.js':'app.js','/diff.js':'diff.js','/playroom.html':'playroom.html','/host.html':'host.html','/viewer.html':'viewer.html','/playroom.js':'playroom.js','/shared-text.js':'shared-text.js'};
http.createServer(async(req,res)=>{
  const file=files[new URL(req.url,'http://localhost').pathname];
  if(!file){res.writeHead(404);return res.end('Not found');}
  try { const body=await readFile(new URL(file,import.meta.url));
    res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store'});res.end(body);
  } catch {res.writeHead(500);res.end('Read failed');}
}).listen(4173,'127.0.0.1',()=>console.log('Synthetic test: http://127.0.0.1:4173 (Ctrl+C to stop)'));
