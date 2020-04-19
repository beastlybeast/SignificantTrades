import store from '../store'

const GRANULARITY = store.state.settings.statsGranularity // 5s
const PERIOD = store.state.settings.statsPeriod // 3m

export default class Counter {
  constructor(callback, { options, model } = {}) {
    this.callback = callback;
    this.options = options;
    this.period = !isNaN(this.options.period) ? +this.options.period : PERIOD;
    this.smoothing = !isNaN(this.options.smoothing) ? +this.options.smoothing : false;
    this.granularity = Math.max(GRANULARITY, this.period / 50)
    this.timeouts = [];

    if (typeof model !== 'undefined') {
      this.model = model;
    }

    console.log('[counter.js] create', {
      callback: this.callback,
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

  onTrades(trades, stats) {
    const data = this.callback(stats, trades)

    if (!this.stacks.length || trades[0].timestamp > this.timestamp + this.granularity) {
      this.appendStack(trades[0].timestamp)
    }

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