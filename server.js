const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const { createClient } = require('@supabase/supabase-js');

const PORT    = 8080;
const PHOTOS  = path.join(__dirname, 'fotos');

if(!fs.existsSync(PHOTOS)){
  fs.mkdirSync(PHOTOS);
}

const supabase = createClient(
  'https://tczmjvcqgscpeyivpbyd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjem1qdmNxZ3NjcGV5aXZwYnlkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDM0MzMxMCwiZXhwIjoyMDk1OTE5MzEwfQ.JkfuUD6RCNM2BVg6t2jgfK5dJxTGLeMarBn2UXzA_aw'
);

const MIME = {
  '.html':'text/html',
  '.css':'text/css',
  '.js':'application/javascript',
  '.json':'application/json',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.ico':'image/x-icon',
  '.woff2':'font/woff2',
  '.woff':'font/woff',
  '.ttf':'font/ttf'
};

async function uploadToSupabase(buffer, filename){

  try{

    const remotePath =
      'public/' + filename;

    const { error } =
      await supabase.storage
        .from('fotos')
        .upload(
          remotePath,
          buffer,
          {
            contentType:'image/jpeg',
            upsert:true
          }
        );

    if(error){

      console.error(
        'Supabase upload error:',
        error.message
      );

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

  }catch(err){

    console.error(
      'Supabase exception:',
      err
    );

    return null;
  }
}

http.createServer(function(req, res){

  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');

  if(req.method==='OPTIONS'){
    res.writeHead(204);
    res.end();
    return;
  }

  if(req.method==='POST' && req.url==='/save-photo'){

    var body='';

    req.on('data',function(chunk){
      body += chunk;
    });

    req.on('end',function(){

      try{

        var obj = JSON.parse(body);

        var b64 =
          obj.dataUrl.replace(
            /^data:image\/\w+;base64,/,
            ''
          );

        var buf =
          Buffer.from(
            b64,
            'base64'
          );

        var fname =
          (
            obj.filename ||
            ('foto_'+Date.now()+'.jpg')
          )
          .replace(
            /[^a-zA-Z0-9._-]/g,
            '_'
          );

        fs.writeFile(
          path.join(PHOTOS, fname),
          buf,
          function(err){

            if(err){

              res.writeHead(500);
              res.end('error');

              return;
            }

            console.log(
              'Foto guardada: fotos/' +
              fname
            );

            /*
             * RESPONDER INMEDIATAMENTE
             */
            res.writeHead(
              200,
              {
                'Content-Type':
                'application/json'
              }
            );

            res.end(
              JSON.stringify({
                ok:true,
                file:'fotos/'+fname
              })
            );

            /*
             * SUBIDA A SUPABASE
             * EN SEGUNDO PLANO
             */
            uploadToSupabase(
              buf,
              fname
            );

          }
        );

      }catch(e){

        console.error(e);

        res.writeHead(400);
        res.end('bad request');
      }
    });

    return;
  }

  var parsed =
    url.parse(req.url).pathname;

  if(parsed==='/'){
    parsed='/index.html';
  }

  var filepath =
    path.join(
      __dirname,
      parsed
    );

  fs.readFile(
    filepath,
    function(err, data){

      if(err){

        res.writeHead(404);
        res.end('Not found');

        return;
      }

      var ext =
        path.extname(filepath)
          .toLowerCase();

      var mime =
        MIME[ext] ||
        'application/octet-stream';

      res.writeHead(
        200,
        {
          'Content-Type':mime
        }
      );

      res.end(data);
    }
  );

}).listen(PORT, function(){

  console.log('');
  console.log(
    '⛏️ CataMiner@s servidor listo'
  );
  console.log(
    '→ http://localhost:' + PORT
  );
  console.log(
    '→ Fotos locales: /fotos'
  );
  console.log(
    '→ Supabase conectado'
  );
  console.log('');
});

process.on(
  'uncaughtException',
  function(err){

    if(err.code==='EADDRINUSE'){

      console.error('');
      console.error(
        'ERROR: puerto 8080 ocupado'
      );
      console.error('');

      process.exit(1);
    }

    throw err;
  }
);
