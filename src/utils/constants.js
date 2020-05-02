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
