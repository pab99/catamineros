const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT    = 8080;
const PHOTOS  = path.join(__dirname, 'fotos');
if(!fs.existsSync(PHOTOS)) fs.mkdirSync(PHOTOS);

const MIME = {
  '.html':'text/html', '.css':'text/css', '.js':'application/javascript',
  '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf'
};

http.createServer(function(req, res){
  // CORS para desarrollo local
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS'){ res.writeHead(204); res.end(); return; }

  // POST /save-photo  { dataUrl, filename }
  if(req.method==='POST' && req.url==='/save-photo'){
    var body='';
    req.on('data',function(chunk){ body+=chunk; });
    req.on('end',function(){
      try{
        var obj = JSON.parse(body);
        var b64 = obj.dataUrl.replace(/^data:image\/\w+;base64,/,'');
        var buf = Buffer.from(b64,'base64');
        var fname = (obj.filename||('foto_'+Date.now()+'.jpg')).replace(/[^a-zA-Z0-9._-]/g,'_');
        fs.writeFile(path.join(PHOTOS, fname), buf, function(err){
          if(err){ res.writeHead(500); res.end('error'); return; }
          console.log('Foto guardada: fotos/'+fname);
          res.writeHead(200,{'Content-Type':'application/json'});
          res.end(JSON.stringify({ok:true, file:'fotos/'+fname}));
        });
      } catch(e){
        res.writeHead(400); res.end('bad request');
      }
    });
    return;
  }

  // GET archivos estáticos
  var parsed = url.parse(req.url).pathname;
  if(parsed==='/') parsed='/index.html';
  var filepath = path.join(__dirname, parsed);

  fs.readFile(filepath, function(err, data){
    if(err){ res.writeHead(404); res.end('Not found'); return; }
    var ext  = path.extname(filepath).toLowerCase();
    var mime = MIME[ext]||'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime});
    res.end(data);
  });

}).listen(PORT, function(){
  console.log('');
  console.log('  ⛏️  CataMiner@s servidor listo');
  console.log('  → Abrí Chrome en: http://localhost:'+PORT);
  console.log('  → Las fotos se guardan en la carpeta: fotos/');
  console.log('  → Ctrl+C para cerrar');
  console.log('');
});

// Manejo de error si el puerto ya está en uso
process.on('uncaughtException', function(err){
  if(err.code === 'EADDRINUSE'){
    console.error('');
    console.error('  ERROR: El puerto 8080 ya está en uso.');
    console.error('  Cerrá el servidor anterior con Ctrl+C y volvé a ejecutar iniciar.bat');
    console.error('');
    process.exit(1);
  }
  throw err;
});
