import store from '../services/store'

export const APPLICATION_START_TIME = +new Date()
export const MASTER_DOMAIN = /aggr.trade$/.test(window.location.hostname)
export const TOUCH_SUPPORTED = (function() {
  var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ')
  var mq = function(query) {
    return window.matchMedia(query).matches
  }

  if ('ontouchstart' in window || (window.DocumentTouch && document instanceof DocumentTouch)) {
    return true
  }

  // include the 'heartz' as a way to have a non matching MQ to help terminate the join
  // https://git.io/vznFH
  var query = ['(', prefixes.join('touch-enabled),('), 'heartz', ')'].join('')
  return mq(query)
})()

export function parseQueryString() {
  let QUERY_STRING

  try {
    QUERY_STRING = JSON.parse(
      '{"' +
        decodeURI(location.search.substring(1))
          .replace(/"/g, '\\"')
          .replace(/&/g, '","')
          .replace(/=/g, '":"') +
        '"}'
    )
  } catch (error) {
    QUERY_STRING = {}
  }

  for (let name in QUERY_STRING) {
    try {
      QUERY_STRING[name] = JSON.parse(QUERY_STRING[name])
    } catch (error) {}
  }

  return QUERY_STRING
}

export function formatAmount(amount, decimals) {
  const negative = amount < 0

  if (negative) {
    amount = Math.abs(amount)
  }

  if (amount >= 1000000) {
    amount = +(amount / 1000000).toFixed(isNaN(decimals) ? 1 : decimals) + 'M'
  } else if (amount >= 1000) {
    amount = +(amount / 1000).toFixed(isNaN(decimals) ? 1 : decimals) + 'K'
  } else {
    amount = formatPrice(amount, decimals, false)
  }

  if (negative) {
    return '-' + amount
  } else {
    return amount
  }
}

export function formatPrice(price, decimals, sats = true) {
  price = +price

  if (isNaN(price) || !price) {
    return (0).toFixed(decimals)
  }

  if (!isNaN(decimals)) {
    return +price.toFixed(decimals)
  }

  if (sats && ((price <= 0.001 && /BTC$/.test(store.state.pair)) || price <= 0.0001)) {
    return (price * 100000000).toFixed() + ' <small class="condensed">sats</small>'
  } else if (price >= 1000) {
    return +price.toFixed(2)
  }

  if (store.state.decimalPrecision) {
    return +price.toFixed(store.state.decimalPrecision)
  }

  const firstDigitIndex = price.toString().match(/[1-9]/)

  if (firstDigitIndex) {
    return +price.toFixed(Math.max(8 - price.toFixed().length, firstDigitIndex.index + 1))
  }

  return +price.toFixed(8 - price.toFixed().length)
}

export function padNumber(num, size) {
  var s = '000000000' + num
  return s.substr(s.length - size)
}

export function ago(timestamp) {
  const seconds = Math.floor((new Date() - timestamp) / 1000)
  let interval, output

  if ((interval = Math.floor(seconds / 31536000)) > 1) output = interval + 'y'
  else if ((interval = Math.floor(seconds / 2592000)) >= 1) output = interval + 'm'
  else if ((interval = Math.floor(seconds / 86400)) >= 1) output = interval + 'd'
  else if ((interval = Math.floor(seconds / 3600)) >= 1) output = interval + 'h'
  else if ((interval = Math.floor(seconds / 60)) >= 1) output = interval + 'm'
  else output = Math.ceil(seconds) + 's'

  return output
}

export function getHms(timestamp, round) {
  const h = Math.floor(timestamp / 1000 / 3600)
  const m = Math.floor(((timestamp / 1000) % 3600) / 60)
  const s = Math.floor(((timestamp / 1000) % 3600) % 60)

  let output = ''

  output += (!round || !output.length) && h > 0 ? h + 'h' + (!round && m ? ', ' : '') : ''
  output += (!round || !output.length) && m > 0 ? m + 'm' + (!round && s ? ', ' : '') : ''
  output += (!round || !output.length) && s > 0 ? s + 's' : ''

  if (!output.length || (!round && timestamp < 60 * 1000 && timestamp > s * 1000))
    output += (output.length ? ', ' : '') + (timestamp - s * 1000) + 'ms'

  return output.trim()
}

export function uniqueName(name, names) {
  let base = name.substr()
  let variante = 1

  while (names.indexOf(name) !== -1) {
    name = base + ++variante
  }

  return name
}
