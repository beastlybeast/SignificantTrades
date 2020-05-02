import { parseQueryString } from '../../utils/helpers'
import { MASTER_DOMAIN } from '../../utils/constants'
import DEFAULTS from './defaults.json'

/**
 *  QUERY STRING PARSER
 *  every options should be settable from querystring using encoded json
 */

const QUERY_STRING = parseQueryString()

/**
 * ACTUAL STORED SETTINGS
 */

let STORED

try {
  STORED = JSON.parse(localStorage.getItem('settings')) || {}
} catch (error) {
  console.log('[store] failed to load settings')

  STORED = {}
}

/**
 *  EXTRA
 *
 *  1.SUBDOMAIN (only for MASTER_DOMAIN)
 *  automaticaly map subdomain as a *pair* and replace it in options
 *  eg: ethusd.aggr.trade will set the *pair* options to ethusd.
 */
const EXTRA = {}

if (MASTER_DOMAIN) {
  const subdomain = window.location.hostname.match(/^([\d\w\-_]+)\..*\./i)
  const except = ['beta', 'www']

  if (subdomain && subdomain.length >= 2 && except.indexOf(subdomain[1]) === -1) {
    EXTRA.pair = subdomain[1].replace(/_/g, '+').toUpperCase()
  }
}

// 14/04/20 (2.5)
// timeframe is now stored in seconds
if (STORED.timeframe > 1000) {
  STORED.timeframe /= 1000
}
// 22/04/20
if (STORED.statsCounters) {
  for (let counter of STORED.statsCounters) {
    counter.output = counter.output
      .replace(/buyCount/g, 'cbuy')
      .replace(/sellCount/g, 'csell')
      .replace(/buyAmount/g, 'vbuy')
      .replace(/sellAmount/g, 'vsell')
  }
}

export default Object.assign({}, DEFAULTS, EXTRA, STORED, QUERY_STRING)
