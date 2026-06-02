const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
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

function generarNombreInstagram(usuario) {
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

  const cleanUser = (usuario || 'sin_usuario')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '');

  return `${fecha}_${hora}_${cleanUser}.jpeg`;
}

async function uploadToSupabase(buffer, filename) {
  try {
    const remotePath = `public/${filename}`;

    const { error } = await supabase.storage
      .from('fotos')
      .upload(remotePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error.message);
      return null;
    }

    const { data } = supabase.storage
      .from('fotos')
      .getPublicUrl(remotePath);

    console.log('☁️ Supabase OK:', data.publicUrl);

    return data.publicUrl;

  } catch (err) {
    console.error('Supabase exception:', err);
    return null;
  }
}

const server = http.createServer((req, res) => {

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // =========================
  // SAVE PHOTO
  // =========================
  if (req.method === 'POST' && req.url === '/save-photo') {

    let body = '';

    req.on('data', chunk => body += chunk);

    req.on('end', async () => {

      try {
        const obj = JSON.parse(body);

        if (!obj.dataUrl) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false, error: 'missing dataUrl' }));
        }

        const ig = (obj.ig || '').trim();
        const filename = generarNombreInstagram(ig);

        const base64 = obj.dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64, 'base64');

        // Guardar local
        const localPath = path.join(PHOTOS, filename);

        fs.writeFile(localPath, buffer, async (err) => {

          if (err) {
            console.error('write error:', err);

            res.writeHead(500);
            return res.end(JSON.stringify({
              ok: false,
              error: 'write error'
            }));
          }

          console.log('📸 Foto guardada:', localPath);

          // responder rápido al frontend
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            file: `fotos/${filename}`
          }));

          // subir a supabase en background
          const publicUrl = await uploadToSupabase(buffer, filename);

          if (publicUrl) {
            console.log('🌍 Public URL:', publicUrl);
          }

        });

      } catch (e) {
        console.error('bad request:', e);

        res.writeHead(400);
        res.end(JSON.stringify({
          ok: false,
          error: 'bad request'
        }));
      }
    });

    return;
  }

  // =========================
  // STATIC FILES
  // =========================
  let parsed = url.parse(req.url).pathname;

  if (parsed === '/') parsed = '/index.html';

  const filepath = path.join(__dirname, parsed);

  fs.readFile(filepath, (err, data) => {

    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }

    const ext = path.extname(filepath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });

});

// =========================
// START
// =========================
server.listen(PORT, () => {
  console.log('');
  console.log('⛏️ CataMiner@s servidor listo');
  console.log('→ Puerto:', PORT);
  console.log('→ Fotos:', PHOTOS);
  console.log('→ Supabase conectado');
  console.log('');
});

// =========================
// SAFETY
// =========================
process.on('uncaughtException', (err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
