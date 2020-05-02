import store from '../store'

export const APPLICATION_START_TIME = +new Date()
export const MASTER_DOMAIN = /aggr.trade$/.test(window.location.hostname)
export const TOUCH_SUPPORTED = (function() {
  var prefixes = ' -webkit- -moz- -o- -ms- '.split(' ')
  var mq = function(query) {
    return window.matchMedia(query).matches
  }

  if ('ontouchstart' in window || (window.DocumentTouch && document instanceof window.DocumentTouch)) {
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
    } catch (error) {
      // empty
    }
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
  } else if (amount >= 100000) {
    amount = +(amount / 1000).toFixed(isNaN(decimals) ? 0 : decimals) + 'K'
  } else if (amount >= 1000) {
    amount = +(amount / 1000).toFixed(isNaN(decimals) ? 1 : decimals) + 'K'
  } else if (store.state.settings.decimalPrecision) {
    amount = amount.toFixed(store.state.settings.decimalPrecision)
  } else {
    amount = +amount.toFixed(4)
  }

  if (negative) {
    return '-' + amount
  } else {
    return amount
  }
}

export function countDecimals(value) {
  if (Math.floor(value) === value) return 0
  return value.toString().split('.')[1].length || 0
}

export function formatPrice(price) {
  price = +price || 0

  if (store.state.settings.decimalPrecision) {
    return price.toFixed(store.state.settings.decimalPrecision)
  } else if (store.state.app.optimalDecimal) {
    return price.toFixed(store.state.app.optimalDecimal)
  } else {
    return price.toFixed(2)
  }
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
  if (isNaN(timestamp) || timestamp === null) {
    return null
  }

  const isNegPrefix = timestamp < 0 ? '-' : ''
  timestamp = Math.abs(timestamp)

  const h = Math.floor(timestamp / 1000 / 3600)
  const m = Math.floor(((timestamp / 1000) % 3600) / 60)
  const s = Math.floor(((timestamp / 1000) % 3600) % 60)

  let output = ''

  output += (!round || !output.length) && h > 0 ? isNegPrefix + h + 'h' + (!round && m ? ', ' : '') : ''
  output += (!round || !output.length) && m > 0 ? isNegPrefix + m + 'm' + (!round && s ? ', ' : '') : ''
  output += (!round || !output.length) && s > 0 ? isNegPrefix + s + 's' : ''

  if (!output.length || (!round && timestamp < 60 * 1000 && timestamp > s * 1000))
    output += (output.length ? ', ' : '') + isNegPrefix + (timestamp - s * 1000) + 'ms'

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

export function movingAverage(accumulator, newValue, alpha) {
  return alpha * newValue + (1.0 - alpha) * accumulator
}

export function formatTime(time) {
  const date = new Date(time * 1000)

  return date.getDate() + '/' + (date.getMonth() + 1) + ' ' + date.toTimeString().split(' ')[0]
}

export function camelToSentence(str) {
  str = str.replace(/([A-Z])/g, ' $1')
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function snakeToSentence(str) {
  str = str.replace(/_/g, ' ')
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const setValueByDotNotation = (object, path, value) => {
  if (path.length === 1) object[path[0]] = value
  else if (path.length === 0) throw 'error'
  else {
    if (object[path[0]]) return setValueByDotNotation(object[path[0]], path.slice(1), value)
    else {
      object[path[0]] = {}
      return setValueByDotNotation(object[path[0]], path.slice(1), value)
    }
  }
}

export const slugify = string => {
  const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
  const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
  const p = new RegExp(a.split('').join('|'), 'g')

  return string
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with 'and'
    .replace(/[^\w-]+/g, '') // Remove all non-word characters
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}
