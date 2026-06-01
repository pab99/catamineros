const video = document.getElementById('video')

export async function initCamera(){
  const stream = await navigator.mediaDevices.getUserMedia({
    video:{ width:1920, height:1080, facingMode:'user' },
    audio:false
  })
  video.srcObject = stream
  await video.play()
  return video
}

export function getVideo(){ return video }
