import store from '../../store'

/**
 * get 1 ohlc bar out of actives exchanges in bar
 * simple average
 * @param {Bar} bar
 */
export function ohlc(bar) {
  let totalWeight = 0
  let setOpen = false

  if (bar.open === null) {
    setOpen = true
    bar.open = 0
  }

  bar.high = 0
  bar.low = 0
  bar.close = 0

  const activeExchanges = store.state.app.actives

  for (let exchange in bar.exchanges) {
    if (activeExchanges.indexOf(exchange) === -1) {
      continue
    }

    if (setOpen) {
      bar.open += bar.exchanges[exchange].open
    }

    bar.high += bar.exchanges[exchange].high
    bar.low += bar.exchanges[exchange].low
    bar.close += bar.exchanges[exchange].close

    totalWeight++
  }

  if (setOpen) {
    bar.open /= totalWeight
  }

  bar.high /= totalWeight
  bar.low /= totalWeight
  bar.close /= totalWeight

  return { open: bar.open, high: bar.high, low: bar.low, close: bar.close }
}

/**
 * exponential moving average
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function ema(memory, value, length) {
  const k = 2 / (length + 1)

  if (memory.count) {
    const last = memory.points[memory.points.length - 1]
    memory.output = (value - last) * k + last
  } else {
    memory.output = value
  }

  return memory.output
}

/**
 * simple moving average
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function sma(memory, value) {
  const average = (memory.sum + value) / (memory.count + 1)
  memory.output = value
  return average
}

/**
 * cumulative moving average
 * @param {SerieMemory} memory
 * @param {number} value
 */
export function cma(memory, value) {
  memory.output = (memory.sum + value) / (memory.count + 1)
  return memory.output
}
