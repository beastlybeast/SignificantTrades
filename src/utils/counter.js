import store from '../store'

export default class Counter {
  constructor(outputFunction, { options, model } = {}) {
    this.outputFunction = outputFunction
    this.period = (!isNaN(options.period) ? +options.period : store.state.settings.statsPeriod) || 0
    this.precision = options.precision
    this.color = options.color
    this.granularity = Math.max(store.state.settings.statsGranularity, this.period / 50)
    this.type = options.type || 'line'

    /**
     * @type {TV.ISeriesApi<Line>}
     */
    this.serie = null

    this.timeouts = []

    if (typeof model !== 'undefined') {
      this.model = model
    }

    console.log('[counter.js] create', {
      outputFunction: this.outputFunction,
      period: this.period,
      granularity: this.granularity
    })

    this.clear()

    if (module.hot) {
      module.hot.dispose(() => {
        this.unbind()
      })
    }
  }

  clear() {
    this.live = this.getModel()
    this.stacks = []

    for (let i = 0; i < this.timeouts.length; i++) {
      clearTimeout(this.timeouts[i])
    }
  }

  unbind() {
    console.log('[counter.js] unbind')

    this.clear()
  }

  onStats(timestamp, stats) {
    const data = this.outputFunction(stats)

    if (!this.stacks.length || timestamp > this.timestamp + this.granularity) {
      this.appendStack(timestamp)
    }

    this.addData(data)
  }

  appendStack(timestamp) {
    if (!timestamp) {
      timestamp = +new Date()
    }

    this.stacks.push(this.getModel())

    this.timestamp = Math.floor(timestamp / 1000) * 1000

    this.timeouts.push(setTimeout(this.shiftStack.bind(this), this.period))
  }

  shiftStack(index = 0) {
    const stack = this.stacks.splice(index, 1)[0]

    if (!stack) {
      return
    }

    this.substractData(stack)

    this.timeouts.shift()
  }

  getModel() {
    return 0
  }

  addData(data) {
    this.stacks[this.stacks.length - 1] += data
    this.live += data
  }

  substractData(data) {
    this.live -= data
  }

  getValue() {
    return this.live
  }
}
