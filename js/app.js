import { initCamera, getVideo }       from './camera.js'
import { showScreen }                  from './ui.js'
import { renderOverlay, resizeOverlay, captureFrame, loadTunnel } from './overlay.js'
import { loadModels, startDetection, stopDetection }  from './faceDetection.js'
import { runCountdown }                from './countdown.js'

let capturedDataUrl = ''
let cameraReady = false

async function boot(){
  // Cargar imagen del túnel con chroma-key
  loadTunnel().then(() => console.log('Túnel cargado'))
  resizeOverlay()
  window.addEventListener('resize', resizeOverlay)

  // Bindear eventos ANTES de cualquier async que pueda fallar
  bindEvents()

  startRenderLoop()

  // Intentar cargar face-api en background (no bloqueante)
  waitForFaceApi()
    .then(() => loadModels())
    .then(() => {
      if(cameraReady) startDetection(getVideo())
      console.log('Face detection active')
    })
    .catch(e => console.warn('Face detection not available:', e))

  console.log('PHOTO MINER BOOTH V12 READY')
}

function waitForFaceApi(){
  return new Promise((resolve, reject) => {
    let tries = 0
    const check = () => {
      if(typeof faceapi !== 'undefined') return resolve()
      if(tries++ > 40) return reject(new Error('face-api timeout'))
      setTimeout(check, 200)
    }
    check()
  })
}

function startRenderLoop(){
  ;(function loop(){
    renderOverlay(window.__igHandle || '')
    requestAnimationFrame(loop)
  })()
}

function bindEvents(){
  // Attract -> Camera
  document.getElementById('screen-attract')
    .addEventListener('click', async () => {
      showScreen('screen-camera')
      try {
        if(!cameraReady){
          await initCamera()
          cameraReady = true
          // Si face-api ya estaba lista, arrancar deteccion ahora
          if(typeof faceapi !== 'undefined'){
            try{ startDetection(getVideo()) }catch(e){}
          }
        }
        startSequence()
      } catch(e) {
        console.error('Error iniciando camara:', e)
        alert('No se pudo acceder a la camara. Verifica los permisos.')
        showScreen('screen-attract')
      }
    })

  // Register -> Save
  document.getElementById('save-btn')
    .addEventListener('click', () => {
      const val = document.getElementById('instagram').value.trim()
      window.__igHandle = val || ''
      goToGallery(val)
    })

  // Register -> Skip
  document.getElementById('skip-btn')
    .addEventListener('click', () => goToGallery(''))
}

async function startSequence(){
  await runCountdown(3)
  flashAndCapture()
}

function flashAndCapture(){
  const flash = document.createElement('div')
  flash.id = 'flash'
  Object.assign(flash.style, {
    position:'fixed', inset:'0', background:'#fff',
    zIndex:'999', pointerEvents:'none',
    animation:'flashWhite .4s ease forwards'
  })
  document.body.appendChild(flash)
  setTimeout(() => flash.remove(), 500)

  capturedDataUrl = captureFrame(window.__igHandle || '')
  setTimeout(() => showScreen('screen-register'), 400)
}

function goToGallery(ig){
  if(ig){
    capturedDataUrl = captureFrame(ig)
  }
  buildGallery(capturedDataUrl, ig)
  showScreen('screen-gallery')
}

function buildGallery(dataUrl, ig){
  const section = document.getElementById('screen-gallery')
  section.innerHTML = ''

  const title = document.createElement('h2')
  title.textContent = 'TU FOTO MINERA'

  const img = document.createElement('img')
  img.id  = 'gallery-photo'
  img.src = dataUrl

  const actions = document.createElement('div')
  actions.id = 'gallery-actions'

  const dlLink = document.createElement('a')
  dlLink.id       = 'btn-download'
  dlLink.href     = dataUrl
  dlLink.download = 'photominer_' + Date.now() + '.jpg'
  dlLink.textContent = 'DESCARGAR'

  const restartBtn = document.createElement('button')
  restartBtn.id          = 'btn-restart'
  restartBtn.textContent = 'OTRA VEZ'
  restartBtn.addEventListener('click', () => {
    document.getElementById('instagram').value = ''
    window.__igHandle = ''
    showScreen('screen-attract')
  })

  actions.appendChild(dlLink)
  actions.appendChild(restartBtn)

  section.appendChild(title)
  section.appendChild(img)
  section.appendChild(actions)
}

boot()
