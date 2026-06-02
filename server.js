const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 8080;

const PHOTOS = path.join(__dirname, 'fotos');

if (!fs.existsSync(PHOTOS)) {
  fs.mkdirSync(PHOTOS);
}

const supabase = createClient(
  'https://tczmjvcqgscpeyivpbyd.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

async function uploadToSupabase(buffer, filename) {

  try {

    const remotePath = 'public/' + filename;

    const { error } =
      await supabase.storage
        .from('fotos')
        .upload(remotePath, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

    if (error) {

      console.error('Supabase upload error:', error.message);
      return null;
    }

    const { data } =
      supabase.storage
        .from('fotos')
        .getPublicUrl(remotePath);

    console.log('');
    console.log('☁️ Supabase OK');
    console.log(data.publicUrl);
    console.log('');

    return data.publicUrl;

  } catch (err) {

    console.error('Supabase exception:', err);
    return null;
  }
}

function generarNombreInstagram() {

  const now = new Date();

  const pad = (n) => String(n).padStart(2, '0');

  const fecha =
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate());

  const hora =
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());

  return `instagram_${fecha}_${hora}.jpeg`;
}

const server = http.createServer(function (req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/save-photo') {

    let body = '';

    req.on('data', function (chunk) {
      body += chunk;
    });

    req.on('end', function () {

      try {

        const obj = JSON.parse(body);

        const b64 =
          obj.dataUrl.replace(/^data:image\/\w+;base64,/, '');

        const buf = Buffer.from(b64, 'base64');

        const fname =
          (obj.filename || generarNombreInstagram())
            .replace(/[^a-zA-Z0-9._-]/g, '_');

        fs.writeFile(
          path.join(PHOTOS, fname),
          buf,
          function (err) {

            if (err) {

              console.error(err);

              res.writeHead(500);
              res.end(JSON.stringify({
                ok: false,
                error: 'write error'
              }));

              return;
            }

            console.log('Foto guardada: fotos/' + fname);

            res.writeHead(200, {
              'Content-Type': 'application/json'
            });

            res.end(JSON.stringify({
              ok: true,
              file: 'fotos/' + fname
            }));

            uploadToSupabase(buf, fname);
          }
        );

      } catch (e) {

        console.error(e);

        res.writeHead(400);
        res.end(JSON.stringify({
          ok: false,
          error: 'bad request'
        }));
      }
    });

    return;
  }

  let parsed = url.parse(req.url).pathname;

  if (parsed === '/') {
    parsed = '/index.html';
  }

  const filepath = path.join(__dirname, parsed);

  fs.readFile(filepath, function (err, data) {

    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filepath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': mime
    });

    res.end(data);
  });

});

server.listen(PORT, function () {

  console.log('');
  console.log('⛏️ CataMiner@s servidor listo');
  console.log('→ Puerto: ' + PORT);
  console.log('→ Fotos locales: /fotos');
  console.log('→ Supabase conectado');
  console.log('');
});

process.on('uncaughtException', function (err) {

  if (err.code === 'EADDRINUSE') {

    console.error('');
    console.error('ERROR: puerto ocupado');
    console.error('');

    process.exit(1);
  }

  throw err;
});
