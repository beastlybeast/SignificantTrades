import store from '../store'
import * as TV from 'lightweight-charts'

const GRANULARITY = store.state.settings.statsGranularity
const PERIOD = store.state.settings.statsPeriod

export default class Counter {
  constructor(outputFunction, { options, model } = {}) {
    this.outputFunction = outputFunction;
    this.period = !isNaN(options.period) ? +options.period : PERIOD;
    this.smoothing = !isNaN(options.smoothing) ? +options.smoothing : false;
    this.precision = options.precision;
    this.color = options.color;
    this.granularity = Math.max(GRANULARITY, this.period / 50)

    /**
     * @type {TV.ISeriesApi<Line>}
     */
    this.serie = null;

    this.timeouts = [];

    if (typeof model !== 'undefined') {
      this.model = model;
    }

    console.log('[counter.js] create', {
      outputFunction: this.outputFunction,
      period: this.period,
      granularity: this.granularity,
    })

    this.clear();

    if (module.hot) {
      module.hot.dispose(() => {
        this.unbind()
      })
    }
  }

  clear() {
    this.live = this.getModel();
    this.stacks = []
    this.lasts = []
    this.sum = 0

    for (let i = 0; i < this.timeouts.length; i++) {
      clearTimeout(this.timeouts[i]);
    }
  }

  unbind() {
    console.log('[counter.js] unbind')
    
    this.clear()
  }

  onStats(timestamp, stats) {
    const data = this.outputFunction(stats)

    this.appendStack(timestamp)

    this.addData(data)
  }

  appendStack(timestamp) {
    if (!timestamp) {
      timestamp = +new Date()
    }

    this.stacks.push(this.getModel())

    if (this.smoothing) {
      this.lasts.push(0);
  
      if (this.lasts.length > this.smoothing) {
        this.sum -= this.lasts.shift()
      }
    }

    this.timestamp = Math.floor(timestamp / 1000) * 1000;

    this.timeouts.push(setTimeout(this.shiftStack.bind(this), this.period))
  }

  shiftStack(index = 0) {
    const stack = this.stacks.splice(index, 1)[0]

    if (!stack) {
      return;
    }

    this.substractData(stack);

    this.timeouts.shift()
  }

  getModel() {
    return 0
  }

  addData(data) {
    this.stacks[this.stacks.length - 1] += data
    this.live += data

    if (this.smoothing) {
      this.sum -= this.lasts[this.lasts.length - 1]
      this.sum += this.live
    
      this.lasts[this.lasts.length - 1] = this.live;
    }
  }

  substractData(data) {
    this.live -= data
  }

  getValue() {
    if (this.smoothing) {
      return this.sum / this.lasts.length;
    }

    return this.live
  }
}