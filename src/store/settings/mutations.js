import Vue from 'vue'

import { uniqueName } from '../../utils/helpers'

export default {
  SET_PAIR(state, value) {
    console.log('SET_PAIR', value.toString().toUpperCase())
    state.pair = value.toString().toUpperCase()

    this.state.app.pairs = state.pair.split('+')
  },
  SET_QUOTE_AS_PREFERED_CURRENCY(state, value) {
    state.preferQuoteCurrencySize = value ? true : false
  },
  SET_MAX_ROWS(state, value) {
    state.maxRows = value
  },
  TOGGLE_SLIPPAGE(state) {
    const values = [false, 'bps', 'price']

    let index = Math.max(0, values.indexOf(state.showSlippage))

    state.showSlippage = values[(index + 1) % values.length]
  },
  TOGGLE_AGGREGATION(state, value) {
    state.aggregateTrades = value ? true : false
  },
  TOGGLE_LOGOS(state, value) {
    state.showLogos = value ? true : false
  },
  TOGGLE_LIQUIDATIONS_ONLY(state, value) {
    state.liquidationsOnly = value ? true : false
  },
  TOGGLE_COUNTERS(state, value) {
    state.showCounters = value ? true : false
  },
  TOGGLE_STATS(state, value) {
    state.showStats = value ? true : false
  },
  TOGGLE_STAT(state, { index, value }) {
    const stat = state.statsCounters[index]

    stat.enabled = value ? true : false

    Vue.set(state.statsCounters, index, stat)
  },
  SET_STAT_OUTPUT(state, { index, value }) {
    const stat = state.statsCounters[index]

    stat.output = value

    Vue.set(state.statsCounters, index, stat)
  },
  SET_STAT_NAME(state, { index, value }) {
    const stat = state.statsCounters[index]
    const names = state.statsCounters.map(a => a.name)

    names.splice(index, 1)

    stat.name = uniqueName(value, names)

    Vue.set(state.statsCounters, index, stat)
  },
  SET_STAT_COLOR(state, { index, value }) {
    const stat = state.statsCounters[index]

    stat.color = value

    Vue.set(state.statsCounters, index, stat)
  },
  SET_STAT_PRECISION(state, { index, value }) {
    const stat = state.statsCounters[index]

    value = parseInt(value)

    stat.precision = !isNaN(value) ? value : null

    Vue.set(state.statsCounters, index, stat)
  },
  SET_STAT_PERIOD(state, { index, value }) {
    const stat = state.statsCounters[index]
    let milliseconds = parseInt(value)

    if (isNaN(milliseconds)) {
      stat.period = null
    } else {
      if (/[\d.]+s/.test(value)) {
        milliseconds *= 1000
      } else if (/[\d.]+h/.test(value)) {
        milliseconds *= 1000 * 60 * 60
      } else {
        milliseconds *= 1000 * 60
      }

      stat.period = milliseconds
    }

    Vue.set(state.statsCounters, index, stat)
  },
  CREATE_STAT(state) {
    state.statsCounters.push({
      name: uniqueName(
        'COUNTER',
        state.statsCounters.map(a => a.name)
      ),
      output: 'vbuy + vsell',
      enabled: false
    })
  },
  REMOVE_STAT(state, index) {
    state.statsCounters.splice(index, 1)
  },
  SET_STATS_PERIOD(state, value) {
    let milliseconds = parseInt(value) || 0

    if (/[\d.]+s/.test(value)) {
      milliseconds *= 1000
    } else if (/[\d.]+h/.test(value)) {
      milliseconds *= 1000 * 60 * 60
    } else {
      milliseconds *= 1000 * 60
    }

    state.statsPeriod = milliseconds
  },
  TOGGLE_STATS_CHART(state, value) {
    state.statsChart = value ? true : false
  },
  TOGGLE_STATS_TIMEFRAME(state, value) {
    state.statsGraphsTimeframe = isNaN(+value) ? 1000 : value
  },
  TOGGLE_STATS_LENGTH(state, value) {
    state.statsGraphsLength = isNaN(+value) ? 50 : value
  },
  REPLACE_COUNTERS(state, counters) {
    state.countersSteps = counters.sort((a, b) => a - b)
  },
  TOGGLE_COUNTERS_COUNT(state, value) {
    state.countersCount = value ? true : false
  },
  TOGGLE_THRESHOLDS_TABLE(state, value) {
    state.showThresholdsAsTable = value ? true : false
  },
  SET_THRESHOLD_AMOUNT(state, payload) {
    const threshold = state.thresholds[payload.index]

    if (threshold) {
      if (typeof payload.value === 'string' && /m|k$/i.test(payload.value)) {
        if (/m$/i.test(payload.value)) {
          threshold.amount = parseFloat(payload.value) * 1000000
        } else {
          threshold.amount = parseFloat(payload.value) * 1000
        }
      }
      threshold.amount = +payload.value

      Vue.set(state.thresholds, payload.index, threshold)
    }
  },
  SET_THRESHOLD_GIF(state, payload) {
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
  SET_THRESHOLD_COLOR(state, payload) {
    const threshold = state.thresholds[payload.index]

    if (threshold) {
      threshold[payload.side] = payload.value

      Vue.set(state.thresholds, payload.index, threshold)
    }
  },
  ADD_THRESHOLD(state) {
    state.thresholds.push({
      amount: state.thresholds[state.thresholds.length - 1].amount * 2,
      buyColor: 'rgb(0, 255, 0)',
      sellColor: 'rgb(255, 0, 0)'
    })
  },
  SET_DECIMAL_PRECISION(state, value) {
    state.decimalPrecision = value
  },
  DELETE_THREDELETE_THRESHOLD(state, index) {
    state.thresholds.splice(index, 1)
  },
  ENABLE_EXCHANGE(state, exchange) {
    Vue.set(state.exchanges[exchange], 'disabled', false)
  },
  DISABLE_EXCHANGE(state, exchange) {
    Vue.set(state.exchanges[exchange], 'disabled', true)
  },
  SHOW_EXCHANGE(state, exchange) {
    Vue.set(state.exchanges[exchange], 'hidden', false)
  },
  HIDE_EXCHANGE(state, exchange) {
    Vue.set(state.exchanges[exchange], 'hidden', true)
  },
  TOGGLE_EXCHANGE_VISIBILITY(state, exchange) {
    Vue.set(state.exchanges[exchange], 'hidden', state.exchanges[exchange].hidden === true ? false : true)
  },
  TOGGLE_SETTINGS_PANEL(state, value) {
    const index = state.settings.indexOf(value)

    if (index === -1) {
      state.settings.push(value)
    } else {
      state.settings.splice(index, 1)
    }
  },
  TOGGLE_AUDIO(state, value) {
    state.useAudio = value ? true : false
  },
  TOGGLE_AUDIO_TEN_PERCENT(state, value) {
    state.audioIncludeInsignificants = value ? true : false
  },
  SET_AUDIO_VOLUME(state, value) {
    state.audioVolume = value
  },
  SET_TIMEFRAME(state, value) {
    state.timeframe = value
  },
  SET_EXCHANGE_THRESHOLD(state, payload) {
    Vue.set(state.exchanges[payload.exchange], 'threshold', +payload.threshold)
  },
  SET_EXCHANGE_MATCH(state, payload) {
    Vue.set(state.exchanges[payload.exchange], 'match', payload.match)
  },
  TOGGLE_CHART(state, value) {
    state.showChart = value ? true : false
  },
  SET_CHART_HEIGHT(state, value) {
    state.chartHeight = value || null
  },
  SET_SIDEBAR_WIDTH(state, value) {
    state.sidebarWidth = value || null
  },
  SET_CHART_REFRESH_RATE(state, value) {
    state.chartRefreshRate = +value || 0
  },
  SET_TIMEZONE_OFFSET(state, value) {
    state.timezoneOffset = +value || 0
  },
  TOGGLE_SERIE(state, { id, value }) {
    if (!state.series[id]) {
      state.series[id] = {}
    }

    Vue.set(state.series[id], 'enabled', value ? true : false)
  },
  SET_SERIE_OPTION(state, { id, key, value }) {
    if (!state.series[id]) {
      state.series[id] = {}
    }

    Vue.set(state.series[id], key, value)
  },
  SET_SERIE_TYPE(state, { id, value }) {
    if (!state.series[id]) {
      state.series[id] = {}
    }

    Vue.set(state.series[id], 'type', value)
  },
  SET_CHART_PRICE_MARGINS(state, value) {
    if (!state.series.price) {
      state.series.price = {}
    }

    state.series.price = {
      scaleMargins: value
    }
  },
  TOGGLE_EXCHANGES_BAR(state, value) {
    state.showExchangesBar = value ? true : false
  }
}
