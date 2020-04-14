import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

const DEFAULTS = {
  pair: 'BTCUSD',
  preferQuoteCurrencySize: true,
  thresholds: [
    {
      amount: 100000,
      buyColor: 'rgba(76,175,80,.33)',
      sellColor: 'rgba(229,115,115,.33)'
    },
    {
      amount: 100000,
      buyColor: 'rgb(91,130,48)',
      sellColor: 'rgb(224,91,82)'
    },
    {
      amount: 1000000,
      gif: 'cash',
      buyColor: 'rgb(156,204,101)',
      sellColor: 'rgb(244,67,54)'
    },
    {
      amount: 10000000,
      gif: 'explosion',
      buyColor: 'rgb(255,160,0)',
      sellColor: 'rgb(233,30,99)'
    }
  ],
  exchanges: {
    huobi: { disabled: true },
    liquid: { disabled: true },
    bithumb: { disabled: true },
    hitbtc: { disabled: true },
    coinex: { disabled: true }
  },
  maxRows: 30,
  aggregateTrades: true,
  decimalPrecision: null,
  showSlippage: false,
  showLogos: true,
  showChart: true,
  chartRefreshRate: 50,
  chartLiquidations: true,
  chartCVD: true,
  timeframe: 10,
  debug: false,
  useAudio: false,
  audioIncludeInsignificants: true,
  audioVolume: 1.5,
  settings: ['other', 'chart', 'audio'],
  chartHeight: null,
  sidebarWidth: null,
  showThresholdsAsTable: true,
  showCounters: false,
  countersPrecision: 10000,
  counterHighlights: false,
  countersSteps: [1000 * 30, 1000 * 60, 1000 * 60 * 15, 1000 * 60 * 30],
  hideIncompleteCounter: true,

  // runtime state
  isSnaped: true,
  isLoading: false,
  actives: []
}

/**
 *  QUERY STRING PARSER
 *  every options should be settable from querystring using encoded json
 */

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

if (subdomain && subdomain.length >= 2) {
  EXTRA.pair = subdomain[1].replace(/\_/g, '+').toUpperCase()
}

// <migrations>

// 29/03/19 (2.3)
// added custom colors, make sure everyone got some
if (STORED && STORED.thresholds && STORED.thresholds.length) {
  for (let i = 0; i < STORED.thresholds.length; i++) {
    if (typeof STORED.thresholds[i].buyColor === 'undefined') {
      STORED.thresholds[i].buyColor = DEFAULTS.thresholds[i].buyColor
    }

    if (typeof STORED.thresholds[i].sellColor === 'undefined') {
      STORED.thresholds[i].sellColor = DEFAULTS.thresholds[i].sellColor
    }
  }
}

if (STORED && STORED.timeframe > 1000) {
  STORED.timeframe /= 1000
}

// </migrations>

/**
 * NON PERSISTENT DATA
 * thoses properties are used in the store logic, but shouldn't be stored in the client storage
 */
const EPHEMERAL_PROPERTIES = ['isSnaped', 'isLoading', 'actives']

const store = new Vuex.Store({
  defaults: DEFAULTS,
  state: Object.assign({}, DEFAULTS, EXTRA, STORED || {}, QUERY_STRING),
  mutations: {
    setPair(state, value) {
      state.pair = value.toString().toUpperCase()
    },
    toggleBaseCurrencySize(state, value) {
      state.preferQuoteCurrencySize = value ? true : false
    },
    setMaxRows(state, value) {
      state.maxRows = value
    },
    setDecimalPrecision(state, value) {
      state.decimalPrecision = value
    },
    toggleSlippage(state) {
      const values = [false, 'bps', 'price']

      let index = Math.max(0, values.indexOf(state.showSlippage))

      state.showSlippage = values[(index + 1) % values.length]
    },
    toggleAggregation(state, value) {
      state.aggregateTrades = value ? true : false
    },
    toggleDebug(state, value) {
      state.debug = value ? true : false
    },
    toggleLogos(state, value) {
      state.showLogos = value ? true : false
    },
    toggleChart(state, value) {
      state.showChart = value ? true : false
    },
    setChartRefreshRate(state, value) {
      state.chartRefreshRate = +value || 0
    },
    toggleChartLiquidations(state, value) {
      state.chartLiquidations = value ? true : false
    },
    toggleChartCVD(state, value) {
      state.chartCVD = value ? true : false
    },
    toggleTresholdsTable(state, value) {
      state.showThresholdsAsTable = value ? true : false
    },
    addThreshold(state) {
      state.thresholds.push({
        amount: state.thresholds[state.thresholds.length - 1].amount * 2,
        buyColor: 'rgb(0, 255, 0)',
        sellColor: 'rgb(255, 0, 0)'
      })
    },
    deleteThreshold(state, index) {
      state.thresholds.splice(index, 1)
    },
    setThresholdAmount(state, payload) {
      const threshold = state.thresholds[payload.index]

      if (threshold) {
        if (typeof payload.value === 'string' && /m|k$/i.test(payload.value)) {
          if (/m$/i.test(value)) {
            threshold.amount = parseFloat(payload.value) * 1000000
          } else {
            threshold.amount = parseFloat(payload.value) * 1000
          }
        }
        threshold.amount = +payload.value

        Vue.set(state.thresholds, payload.index, threshold)
      }
    },
    setThresholdGif(state, payload) {
      const threshold = state.thresholds[payload.index]

      if (threshold) {
        if (payload.value.trim().length) {
          threshold.gif = payload.value
        } else {
          payload.value = threshold.gif
          payload.isDeleted = true

          threshold.gif = null
        }

        Vue.set(state.thresholds, payload.index, threshold)
      }
    },
    setThresholdColor(state, payload) {
      const threshold = state.thresholds[payload.index]

      if (threshold) {
        threshold[payload.side] = payload.value

        Vue.set(state.thresholds, payload.index, threshold)
      }
    },
    enableExchange(state, exchange) {
      Vue.set(state.exchanges[exchange], 'disabled', false)
    },
    disableExchange(state, exchange) {
      Vue.set(state.exchanges[exchange], 'disabled', true)
    },
    showExchange(state, exchange) {
      Vue.set(state.exchanges[exchange], 'hidden', false)
    },
    hideExchange(state, exchange) {
      Vue.set(state.exchanges[exchange], 'hidden', true)
    },
    toggleExchangeVisibility(state, exchange) {
      Vue.set(state.exchanges[exchange], 'hidden', state.exchanges[exchange].hidden === true ? false : true)
    },
    toggleSettingsPanel(state, value) {
      const index = state.settings.indexOf(value)

      if (index === -1) {
        state.settings.push(value)
      } else {
        state.settings.splice(index, 1)
      }
    },
    toggleAudio(state, value) {
      state.useAudio = value ? true : false
    },
    toggleAudioIncludeInsignificants(state, value) {
      state.audioIncludeInsignificants = value ? true : false
    },
    setAudioVolume(state, value) {
      state.audioVolume = value
    },
    setTimeframe(state, value) {
      state.timeframe = value
    },
    setExchangeThreshold(state, payload) {
      Vue.set(state.exchanges[payload.exchange], 'threshold', +payload.threshold)
    },
    setExchangeMatch(state, payload) {
      Vue.set(state.exchanges[payload.exchange], 'match', payload.match)
    },
    setChartHeight(state, value) {
      state.chartHeight = value || null
    },
    setSidebarWidth(state, value) {
      state.sidebarWidth = value || null
    },
    toggleCounters(state, value) {
      state.showCounters = value ? true : false
    },
    toggleCounterHighlights(state, value) {
      state.counterHighlights = value ? true : false
    },
    setCounterPrecision(state, payload) {
      state.counterPrecision = value
    },
    toggleHideIncompleteCounter(state, value) {
      state.hideIncompleteCounter = value ? true : false
    },
    toggleCumulativeCounters(state, value) {
      state.cumulativeCounters = value ? true : false
    },
    setCounterStep(state, payload) {
      const step = state.countersSteps[payload.index]

      if (payload.value) {
        Vue.set(state.countersSteps, payload.index, payload.value)
      } else {
        state.countersSteps.splice(payload.index, 1)
      }

      state.countersSteps = state.countersSteps.sort((a, b) => a - b)
    },
    replaceCounterSteps(state, counters) {
      state.countersSteps = counters.sort((a, b) => a - b)
    },

    // runtime commit
    toggleLoading(state, value) {
      state.isLoading = value ? true : false
    },
    reloadExchangeState(state, exchange) {
      if (!exchange) {
        return
      }

      if (typeof exchange === 'object' && exchange.exchange) {
        exchange = exchange.exchange
      } else if (typeof exchange !== 'string') {
        return
      }

      if (!state.exchanges[exchange]) {
        Vue.set(state.exchanges, exchange, {})
      }

      const index = state.actives.indexOf(exchange)
      const active = state.exchanges[exchange].match && !state.exchanges[exchange].disabled && !state.exchanges[exchange].hidden

      if (active && index === -1) {
        state.actives.push(exchange)
      } else if (!active && index >= 0) {
        state.actives.splice(index, 1)
      }
    }
  }
})

store.subscribe((mutation, state) => {
  const copy = JSON.parse(JSON.stringify(state))

  for (let name of EPHEMERAL_PROPERTIES) {
    if (copy.hasOwnProperty(name)) {
      delete copy[name]
    }
  }

  if (['reloadExchangeState', 'setExchangeMatch'].indexOf(mutation.type) === -1) {
    localStorage.setItem('settings', JSON.stringify(copy))
  }

  switch (mutation.type) {
    case 'showExchange':
    case 'hideExchange':
    case 'toggleExchangeVisibility':
    case 'enableExchange':
    case 'disableExchange':
    case 'setExchangeMatch':
      store._mutations.reloadExchangeState[0](mutation.payload)

      clearTimeout(this._reloadExchangeStateTimeout)

      this._reloadExchangeStateTimeout = setTimeout(() => {
        store.commit('reloadExchangeState', null)
      }, 500)
      break
  }
})

export default store
