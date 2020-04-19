import { parseQueryString } from '../../utils/helpers'
import DEFAULTS from './defaults.json'

/**
 *  QUERY STRING PARSER
 *  every options should be settable from querystring using encoded json
 */

const QUERY_STRING = parseQueryString()

/**
 * ACTUAL STORED OBJECT
 */

const STORED = JSON.parse(localStorage.getItem('settings'))

/**
 *  EXTRA
 *
 *  1.SUBDOMAIN
 *  automaticaly map subdomain as a *pair* and replace it in options
 *  eg: ethusd.aggr.trade will set the *pair* options to ethusd.
 */
const EXTRA = {}

const subdomain = window.location.hostname.match(/^([\d\w\-\_]+)\..*\./i)
const except = ['beta', 'www']

if (subdomain && subdomain.length >= 2 && except.indexOf(except) === -1) {
  EXTRA.pair = subdomain[1].replace(/\_/g, '+').toUpperCase()
}

// 14/04/20 (2.5)
// timeframe is now stored in seconds
if (STORED && STORED.timeframe > 1000) {
  STORED.timeframe /= 1000
}

export default Object.assign({}, DEFAULTS, EXTRA, STORED || {}, QUERY_STRING);