import { setFace } from './overlay.js'

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model'

let detecting = false

export async function loadModels(){
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
  console.log('Face detection model loaded')
}

export function startDetection(video){
  if(detecting) return
  detecting = true
  detect(video)
}

async function detect(video){
  if(!detecting) return

  try{
    const det = await faceapi.detectSingleFace(
      video,
      new faceapi.TinyFaceDetectorOptions({ inputSize:320, scoreThreshold:0.5 })
    )
    setFace(det || null)
  }catch(e){
    // silencio
  }

  setTimeout(() => detect(video), 80) // ~12fps de detección
}

export function stopDetection(){ detecting = false }
