import Tuna from 'tunajs'
import store from '../store'

class Sfx {
  constructor() {
    this.timestamp = +new Date()

    this.connect()
  }

  connect() {
    this.context = new (window.AudioContext || window.webkitAudioContext)()
    this.queued = 0

    var tuna = new Tuna(this.context)
    this.output = new tuna.PingPongDelay({
      wetLevel: 0.6, //0 to 1
      feedback: 0.01, //0 to 1
      delayTimeLeft: 175, //1 to 10000 (milliseconds)
      delayTimeRight: 100 //1 to 10000 (milliseconds)
    })
    var delay = new tuna.Delay({
      feedback: 0.3, //0 to 1+
      delayTime: 80, //1 to 10000 milliseconds
      wetLevel: 0.3, //0 to 1+
      dryLevel: 0.5, //0 to 1+
      cutoff: 2000, //cutoff frequency of the built in lowpass-filter. 20 to 22050
      bypass: 1
    })
    var compressor = new tuna.Compressor({
      threshold: -1, //-100 to 0
      makeupGain: 1, //0 and up (in decibels)
      attack: 1, //0 to 1000
      release: 0, //0 to 3000
      ratio: 4, //1 to 20
      knee: 5, //0 to 40
      automakeup: true, //true/false
      bypass: 0
    })
    var filter = new tuna.Filter({
      frequency: 800, //20 to 22050
      Q: 10, //0.001 to 100
      gain: -10, //-40 to 40 (in decibels)
      filterType: 'highpass', //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
      bypass: 0
    })
    this.output.connect(filter)
    filter.connect(delay)
    delay.connect(compressor)
    compressor.connect(this.context.destination)
  }

  tradeToSong(factor, side, variant) {
    const now = +new Date()

    this.queued++

    setTimeout(() => {
      this.queued--

      if (side === 'buy') {
        if (variant === 0) {
          this.play(659.26, Math.sqrt(factor) / 10, 0.1 + Math.sqrt(factor) / 10)
        } else if (variant === 1) {
          ;[659.26, 830.6].forEach((f, i) => setTimeout(() => this.play(f, 0.05 + Math.sqrt(factor) / 10, 0.1 + factor * 0.1), i * 80))
        } else if (variant >= 2) {
          ;[659.26, 830.6, 987.76, 1318.52].forEach((f, i) =>
            setTimeout(() => this.play(f, 0.05 + Math.sqrt(factor) / 25, 0.1 + factor * 0.1), i * 80)
          )
        }
      } else {
        if (variant === 0) {
          this.play(493.88, Math.sqrt(factor * 1.5) / 10, 0.1 + Math.sqrt(factor) / 10)
        } else if (variant === 1) {
          ;[493.88, 392].forEach((f, i) => setTimeout(() => this.play(f, 0.05 + Math.sqrt(factor * 1.5) / 10, 0.1 + factor * 0.1), i * 80))
        } else if (variant >= 2) {
          ;[493.88, 369.99, 293.66, 246.94].forEach((f, i) =>
            setTimeout(() => this.play(f, 0.05 + Math.sqrt(factor * 1.5) / 10, i > 2 ? 0.1 + factor * 0.1 : 0.2), i > 2 ? 80 * 3 : i * 80)
          )
        }
      }
    }, this.timestamp - now)

    this.timestamp = Math.max(this.timestamp, now) + (this.queued > 10 ? (this.queued > 20 ? 20 : 40) : 80)
  }

  play(frequency, value = 0.5, length = 0.1, type = 'triangle') {
    if (this.context.state !== 'running') {
      return
    }

    const time = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()

    oscillator.frequency.value = frequency
    oscillator.type = type

    oscillator.onended = () => {
      oscillator.disconnect()
    }

    gain.connect(this.output)
    oscillator.connect(gain)
    length *= 1.3

    var volume = Math.max(0.02, Math.min(1, value)) * store.state.settings.audioVolume

    gain.gain.value = volume

    gain.gain.setValueAtTime(gain.gain.value, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + length)

    oscillator.start(time)
    oscillator.stop(time + length)
  }

  liquidation(size) {
    const now = +new Date()

    this.queued++

    setTimeout(() => {
      this.queued--
      ;[329.63, 329.63].forEach((f, i) => {
        size = Math.sqrt(size) / 4

        setTimeout(() => this.play(f, size, 0.25, 'sine'), i * 80)
      })
    }, this.timestamp - now)

    this.timestamp = Math.max(this.timestamp, now) + (this.queued > 10 ? (this.queued > 20 ? 20 : 40) : 80)
  }

  disconnect() {
    this.context && this.context.state === 'running' && this.context.close()
  }
}

export default Sfx
