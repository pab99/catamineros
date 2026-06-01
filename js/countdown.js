const el = document.getElementById('countdown')

export function runCountdown(seconds = 3){
  return new Promise(resolve => {
    let n = seconds

    function tick(){
      el.textContent = n
      el.style.animation = 'none'
      void el.offsetWidth // reflow para reiniciar animación
      el.style.animation = 'countdownPop .9s ease forwards'

      n--
      if(n < 0){
        el.textContent = ''
        resolve()
      } else {
        setTimeout(tick, 1000)
      }
    }

    tick()
  })
}
