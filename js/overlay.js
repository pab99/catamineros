const canvas = document.getElementById('overlay')
const ctx    = canvas.getContext('2d')

const HELMET_EMOJI = '⛑️'

let lastFace     = null
let tunnelCanvas = null   // canvas con el túnel ya recortado (sin verde)

export function setFace(det){ lastFace = det }

export function resizeOverlay(){
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
}

// ─── Carga el tunel.jpg y aplica chroma-key UNA VEZ ─────────────────────────
export function loadTunnel(){
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      // Canvas temporal del tamaño original de la imagen
      const tmp = document.createElement('canvas')
      tmp.width  = img.naturalWidth
      tmp.height = img.naturalHeight
      const tc = tmp.getContext('2d')
      tc.drawImage(img, 0, 0)

      // Chroma-key: volver transparentes los píxeles verdes
      const id   = tc.getImageData(0, 0, tmp.width, tmp.height)
      const data = id.data
      for(let i = 0; i < data.length; i += 4){
        const r = data[i], g = data[i+1], b = data[i+2]
        // Verde puro del túnel: g alto, r bajo, b bajo
        // Tolerancia generosa para capturar todos los matices del verde
        if(g > 100 && g > r * 1.4 && g > b * 1.4){
          data[i+3] = 0   // alpha = 0 → transparente
        }
      }
      tc.putImageData(id, 0, 0)

      tunnelCanvas = tmp
      resolve()
    }
    img.onerror = () => { tunnelCanvas = null; resolve() }
    img.src = 'assets/tunel.jpg'
  })
}

// ─── Render principal ────────────────────────────────────────────────────────
export function renderOverlay(instagram = ''){
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 1. Túnel (ocupa toda la pantalla, sin el verde)
  if(tunnelCanvas){
    ctx.drawImage(tunnelCanvas, 0, 0, canvas.width, canvas.height)
  } else {
    // Fallback: esquinas doradas clásicas
    drawCorners()
  }

  // 2. Header y footer
  drawHeader()
  if(instagram) drawFooter(instagram)

  // 3. Casco sobre la cara
  if(lastFace) drawHelmet(lastFace)
}

// ─── Header ──────────────────────────────────────────────────────────────────
function drawHeader(){
  const W = canvas.width

  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, 0, W, 90)

  const fontSize = Math.round(W * 0.038)
  ctx.font         = `${fontSize}px 'Black Ops One', serif`
  ctx.fillStyle    = '#FFD700'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor  = 'rgba(255,215,0,0.6)'
  ctx.shadowBlur   = 18

  ctx.fillText('⛏️  PHOTO MINER BOOTH 2026  ⛏️', W / 2, 45)

  ctx.shadowBlur = 0
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function drawFooter(ig){
  const W = canvas.width, H = canvas.height
  const handle = ig.startsWith('@') ? ig : '@' + ig
  const barH   = 64
  const barW   = Math.min(400, W * 0.6)
  const x      = W / 2 - barW / 2
  const y      = H - 24 - barH

  ctx.fillStyle = 'rgba(0,0,0,0.75)'
  ctx.fillRect(x, y, barW, barH)

  const fontSize = Math.round(W * 0.026)
  ctx.font         = `700 ${fontSize}px 'Oswald', sans-serif`
  ctx.fillStyle    = '#FFD700'
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'

  ctx.fillText(`💎  ${handle}  💎`, W / 2, y + barH / 2)
}

// ─── Esquinas fallback ───────────────────────────────────────────────────────
function drawCorners(){
  const W = canvas.width, H = canvas.height
  const size = 70, stroke = 6, pad = 24

  ctx.strokeStyle = '#FFD700'
  ctx.lineWidth   = stroke
  ctx.lineCap     = 'square'

  const corners = [
    [pad,     pad,      1,  1],
    [W - pad, pad,     -1,  1],
    [pad,     H - pad,  1, -1],
    [W - pad, H - pad, -1, -1],
  ]
  corners.forEach(([x, y, dx, dy]) => {
    ctx.beginPath()
    ctx.moveTo(x + dx * size, y)
    ctx.lineTo(x, y)
    ctx.lineTo(x, y + dy * size)
    ctx.stroke()
  })
}

// ─── Casco ───────────────────────────────────────────────────────────────────
function drawHelmet(det){
  const video = document.getElementById('video')
  const vW = video.videoWidth  || canvas.width
  const vH = video.videoHeight || canvas.height

  const scaleX = canvas.width  / vW
  const scaleY = canvas.height / vH

  const faceX = (vW - det.box.x - det.box.width) * scaleX
  const faceY = det.box.y * scaleY
  const faceW = det.box.width  * scaleX

  const helmetW = faceW * 1.35
  const helmetX = faceX + faceW / 2 - helmetW / 2
  const helmetY = faceY - helmetW * 0.65

  ctx.font         = `${Math.round(helmetW)}px serif`
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(HELMET_EMOJI, helmetX, helmetY)
}

// ─── Captura final ───────────────────────────────────────────────────────────
export function captureFrame(instagram = ''){
  const video = document.getElementById('video')
  const snap  = document.createElement('canvas')
  snap.width  = canvas.width
  snap.height = canvas.height
  const sc = snap.getContext('2d')

  // Video (con mirror)
  sc.save()
  sc.translate(snap.width, 0)
  sc.scale(-1, 1)
  sc.drawImage(video, 0, 0, snap.width, snap.height)
  sc.restore()

  // Overlay con túnel + helmet + handle
  renderOverlay(instagram)
  sc.drawImage(canvas, 0, 0)

  return snap.toDataURL('image/jpeg', 0.92)
}
