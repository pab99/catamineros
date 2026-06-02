const video = document.getElementById('video')

export async function initCamera(){
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: { ideal: 'user' } }
    audio:false
  })
  video.srcObject = stream
  await video.play()
  return video
}

export function getVideo(){ return video }
