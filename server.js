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
  '.ico': 'image/x-icon'
};

// =========================
// NOMBRE ARCHIVO
// =========================
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

// =========================
// SUPABASE UPLOAD + DB INSERT
// =========================
async function uploadToSupabase(buffer, filename, usuarioIg) {
  try {
    const remotePath = `public/${filename}`;

    const { error } = await supabase.storage
      .from('fotos')
      .upload(remotePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error.message);
      return null;
    }

    const { data } = supabase.storage
      .from('fotos')
      .getPublicUrl(remotePath);

    console.log('☁️ Supabase storage OK:', data.publicUrl);

    // INSERT EN DB
    const { error: dbError } = await supabase.from('fotos_mineros').insert([
      {
        usuario_ig: usuarioIg,
        filename: filename,
        storage_path: remotePath,
        public_url: data.publicUrl,
        device_info: '',
        evento: 'cataminers_2026'
      }
    ]);

    if (dbError) {
      console.error('DB insert error:', dbError.message);
    } else {
      console.log('📋 DB OK:', usuarioIg, filename);
    }

    return data.publicUrl;

  } catch (err) {
    console.error('Supabase error:', err);
    return null;
  }
}

// =========================
// SERVER
// =========================
const server = http.createServer((req, res) => {

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

        const ig = (obj.ig || obj.usuario || '').trim();
        const safeIg = ig.length ? ig : 'sin_usuario';

        if (!obj.dataUrl) {
          res.writeHead(400);
          return res.end(JSON.stringify({ ok: false }));
        }

        const filename = generarNombreInstagram(safeIg);
        const base64 = obj.dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64, 'base64');
        const localPath = path.join(PHOTOS, filename);

        // ✅ FIX: se pasaba buffer faltante en fs.writeFile
        fs.writeFile(localPath, buffer, async (err) => {
          if (err) {
            console.error('writeFile error:', err);
            res.writeHead(500);
            return res.end(JSON.stringify({ ok: false }));
          }

          console.log('📸 Guardada local:', filename);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, file: `fotos/${filename}` }));

          // subir a supabase (background)
          uploadToSupabase(buffer, filename, safeIg);
        });

      } catch (e) {
        console.error(e);
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false }));
      }
    });

    return;
  }

  // =========================
  // API: GALERÍA (para led.html)
  // =========================
  if (req.method === 'GET' && req.url === '/api/fotos') {
    (async () => {
      const { data, error } = await supabase
        .from('fotos_mineros')
        .select('public_url, usuario_ig, filename')
        .eq('oculta', false)
        .order('id', { ascending: false })
        .limit(100);

      if (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: error.message }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, fotos: data || [] }));
    })();
    return;
  }

  // =========================
  // API: DASHBOARD (todas las fotos, sin filtro oculta)
  // =========================
  if (req.method === 'GET' && req.url === '/api/dashboard') {
    (async () => {
      const { data, error } = await supabase
        .from('fotos_mineros')
        .select('id, usuario_ig, filename, public_url, descargas, oculta, created_at, evento')
        .order('id', { ascending: false })
        .limit(1000);

      if (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: error.message }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, fotos: data || [] }));
    })();
    return;
  }

  // =========================
  // API: OCULTAR FOTO (falso borrado)
  // =========================
  if (req.method === 'POST' && req.url === '/api/ocultar') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { public_url, usuario_ig } = JSON.parse(body);

        if (!public_url || !usuario_ig) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Faltan datos' }));
        }

        // Solo oculta si el usuario_ig coincide — evita borrados cruzados
        const { error } = await supabase
          .from('fotos_mineros')
          .update({ oculta: true })
          .eq('public_url', public_url)
          .eq('usuario_ig', usuario_ig);

        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: error.message }));
        }

        console.log('🗑 Foto ocultada:', usuario_ig, public_url);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }

  // =========================
  // API: REGISTRAR DESCARGA
  // =========================
  if (req.method === 'POST' && req.url === '/api/descarga') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { public_url, usuario_ig } = JSON.parse(body);

        // Incrementar contador en la fila correspondiente
        const { data: foto } = await supabase
          .from('fotos_mineros')
          .select('id, descargas')
          .eq('public_url', public_url)
          .single();

        if (foto) {
          await supabase
            .from('fotos_mineros')
            .update({ descargas: (foto.descargas || 0) + 1 })
            .eq('id', foto.id);
        }

        // Insertar registro en tabla de eventos
        await supabase.from('eventos_descarga').insert([{
          usuario_ig: usuario_ig || '',
          public_url: public_url,
          evento: 'cataminers_2026'
        }]);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch(e) {
        res.writeHead(200); // silencioso para el cliente
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }

  // =========================
  // API: BUSCAR POR INSTAGRAM (para mi-foto.html)
  // =========================
  if (req.method === 'GET' && req.url.startsWith('/api/buscar')) {
    const parsed = url.parse(req.url, true);
    const ig = (parsed.query.ig || '')
      .replace('@', '')
      .trim()
      .toLowerCase();

    if (!ig) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'Falta ig' }));
    }

    (async () => {
      const { data, error } = await supabase
        .from('fotos_mineros')
        .select('public_url, usuario_ig, filename')
        .eq('usuario_ig', ig)
        .eq('oculta', false)
        .order('id', { ascending: false })
        .limit(10);

      if (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: error.message }));
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, fotos: data || [] }));
    })();
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
  console.log('⛏️ CataMiner@s OK');
  console.log('→ Puerto:', PORT);
});
