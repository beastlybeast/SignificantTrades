<template>
  <div id="chart">
    <div class="chart__container" ref="chartContainer"></div>

    <div
      class="chart__handler -width"
      ref="chartWidthHandler"
      @mousedown="startManualResize($event, 'width')"
      @dblclick.stop.prevent="resetWidth"
    ></div>
    <div
      class="chart__handler -height"
      ref="chartHeightHandler"
      @mousedown="startManualResize($event, 'height')"
      @dblclick.stop.prevent="resetHeight"
    ></div>

    <div class="chart__legend">
      <div
        v-for="(serie, index) in series"
        :key="index"
        class="chart-serie"
      >{{ serie }} {{ legend[serie] }}</div>
    </div>
    <div class="chart__debug" v-if="debug">
      <div class="chart__debug-container">
        <pre>{{ candledump }}</pre>
      </div>
    </div>
    <div class="chart__debug -right" v-if="debug">
      <pre>visible range: {{ visibleRange }}</pre>
      <pre>rendrered range: {{ renderedRange }}</pre>
      <pre>cache range: {{ cacheRange }}</pre>
      <pre>{{ chunks }}</pre>
    </div>
    <!--<div class="chart__debug -bottom -right" v-if="debug">
      <pre v-for="(actvity, index) in activities">{{ actvity }}</pre>
    </div>-->
  </div>
</template>

<script>
import { mapState } from 'vuex'

import socket from '../../services/socket'
import { chartOptions, seriesOptions, histogramOptions } from './options'
import { APPLICATION_START_TIME, formatPrice, formatAmount, getHms } from '../../utils/helpers'

import * as TV from 'lightweight-charts'

/** @type {TV.IChartApi} */
let chart

/**
 * @type Serie[]
 */
const series = []

/**
 * @type ActiveBar
 */
let activeBar = null

/**
 * @type Chunk
 */
let activeChunk = null

/**
 * @type Chunk[]
 */
const cache = []

/**
 * @type Range
 */
const cacheRange = { from: null, to: null }

/**
 * @type Range
 */
const renderedRange = { from: null, to: null }

/**
 * @type Trade[]
 */
const queuedTrades = []

let isCrosshairActive = false

/**
 * @typedef {{
 *  exchange: string,
 *  timestamp: number,
 *  price: number,
 *  size: number,
 *  side: 'buy' | 'sell',
 *  liquidation?: boolean,
 *  slippage?: number,
 * }} Trade
 */

/**
 * @typedef {{
 *  from: number,
 *  to: number
 * }} Range
 */

/**
 * @typedef {{
 *  id: string,
 *  fn: function,
 *  type: string,
 *  api: TV.ISeriesApi
 * }} Serie
 */

/**
 * @typedef {{
 *  from: number,
 *  to: number,
 *  bars: Bar[],
 * }} Chunk
 */

/**
 * @typedef {{
 *  timestamp: number,
 *  exchanges: {[name: string]: Bar},
 *  vbuy: number,
 *  vsell: number,
 *  cbuy: number,
 *  csell: number,
 *  lbuy: number,
 *  lsell: number,
 * }} ActiveBar
 */

/**
 * @typedef {{
 *  exchange: number,
 *  timestamp: number,
 *  vbuy: number,
 *  vsell: number,
 *  cbuy: number,
 *  csell: number,
 *  lbuy: number,
 *  lsell: number,
 *  open: number,
 *  high: number,
 *  low: number,
 *  close: number,
 * }} Bar
 */

export default {
  data() {
    return {
      resizing: {},
      fetching: false,
      legend: {},
      series: [],
      candledump: '',
      renderedRange: '',
      cacheRange: '',
      visibleRange: '',
      chunks: '',
      activities: []
    }
  },
  computed: {
    ...mapState([
      'debug',
      'pair',
      'timeframe',
      'actives',
      'exchanges',
      'chartHeight',
      'sidebarWidth',
      'chartRefreshRate',
      'chartLiquidations',
      'chartCVD'
    ])
  },
  created() {
    socket.$on('trades', this.onTrades)

    socket.$on('clean', this.onClean)

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'reloadExchangeState':
          if (+new Date() - APPLICATION_START_TIME > 1000) {
            this.renderVisibleChunks()
          }
          break
        case 'setPair':
          this.clearChart()
          this.clearData()
          break
        case 'setTimeframe':
          this.clearChart()
          this.clearData()
          this.setTimeframe(mutation.payload)
          break
        case 'setChartRefreshRate':
          this.clearQueue()
          this.setupQueue()
          break
      }
    })

    window.getCache = () => {
      return cache
    }
    window.getActiveBar = () => {
      return activeBar
    }
    window.getRanges = () => {
      const visibleRange = this.getVisibleRange()

      return {
        cacheRange: {
          from: this.formatTime(cacheRange.from),
          to: this.formatTime(cacheRange.to)
        },
        renderedRange: {
          from: this.formatTime(renderedRange.from),
          to: this.formatTime(renderedRange.to)
        },
        visibleRange: {
          from: this.formatTime(visibleRange.from),
          to: this.formatTime(visibleRange.to)
        }
      }
    }
    window.getActiveBarPending = () => {
      if (!activeBar) {
        return null
      }

      var exchanges = Object.keys(activeBar.exchanges)
        .filter(a => activeBar.exchanges[a].hasData)
        .map(a => a)

      return {
        time: this.formatTime(activeBar.timestamp),
        exchanges
      }
    }
    window.getSeries = () => {
      return series
    }
  },
  mounted() {
    console.log(`[chart.mounted]`)

    this.createChart()

    this._doWindowResize = this.doWindowResize.bind(this)

    window.addEventListener('resize', this._doWindowResize, false)

    this.setTimeframe(this.timeframe)
  },
  beforeDestroy() {
    this.destroyChart()

    socket.$off('trades', this.onTrades)

    socket.$off('clean', this.onClean)

    window.removeEventListener('resize', this._doWindowResize)

    this.onStoreMutation()

    this.clearQueue()
  },
  methods: {
    /**
     * create the chart, subscribe to chart events and register series
     */
    createChart() {
      this.destroyChart()

      const options = Object.assign({}, chartOptions, this.getChartSize())

      chart = TV.createChart(this.$refs.chartContainer, options)
      chart.subscribeClick(this.onClick)
      chart.subscribeCrosshairMove(this.onCrosshair)
      chart.subscribeVisibleTimeRangeChange(this.onPan)

      window.tvchart = chart

      this.addSerie(
        'price',
        'candlestick',
        bar => {
          return this.getExchangesAveragedOHLC(bar)
        },
        {
          scaleGroup: 'price'
        }
      )

      this.addSerie(
        'volume_sell_ema',
        'line',
        bar => {
          return { value: bar.vsell }
        },
        {
          ema: true,
          length: 14,
          scaleGroup: 'volume_ema',
          color: '#c14047',
          lineWidth: 2,
          overlay: true,
          scaleMargins: {
            top: 0.8,
            bottom: 0
          }
        }
      )

      this.addSerie(
        'volume_buy_ema',
        'line',
        bar => {
          return { value: bar.vbuy }
        },
        {
          ema: true,
          length: 14,
          scaleGroup: 'volume_ema',
          color: '#c9b087',
          lineWidth: 2,
          overlay: true,
          scaleMargins: {
            top: 0.8,
            bottom: 0
          }
        }
      )

      this.addSerie(
        'volume_delta',
        'histogram',
        bar => {
          return {
            value: Math.abs(bar.vbuy - bar.vsell),
            color: bar.vbuy - bar.vsell > 0 ? seriesOptions.candlestick.upColor : seriesOptions.candlestick.downColor
          }
        },
        {
          scaleGroup: 'volume'
        }
      )

      this.addSerie(
        'volume',
        'histogram',
        bar => {
          return { value: bar.vbuy + bar.vsell }
        },
        {
          color: 'rgba(255, 255, 255, .15)',
          scaleGroup: 'volume'
        }
      )

      /*this.addSerie(
        'count',
        'histogram',
        bar => {
          return { value: -(bar.cbuy + bar.csell) }
        },
        {
          color: 'rgba(255, 255, 255, .15)',
          scaleGroup: 'count',
          scaleMargins: {
            top: 0,
            bottom: 0.8
          }
        }
      )

      this.addSerie(
        'count_delta',
        'histogram',
        bar => {
          return {
            value: -Math.abs(bar.cbuy - bar.csell),
            color: bar.cbuy - bar.csell > 0 ? seriesOptions.candlestick.upColor : seriesOptions.candlestick.downColor
          }
        },
        {
          scaleGroup: 'count',
          scaleMargins: {
            top: 0,
            bottom: 0.8
          }
        }
      )*/

      this.addSerie(
        'price_sma',
        'line',
        bar => {
          return { value: bar.series.price.point.close }
        },
        {
          sma: true,
          length: 14,
          color: '#8c61f5',
          lineWidth: 2
        }
      )

      this.addSerie(
        'cvd',
        'line',
        bar => {
          return { value: bar.series.cvd.value + (bar.vbuy - bar.vsell) }
        },
        {
          color: '#c9b087',
          lineWidth: 2,
          overlay: true,
          scaleMargins: {
            top: 0.0,
            bottom: 0.7
          }
        }
      )

      /*this.addSerie(
        'liquidations',
        'histogram',
        bar => {
          return { value: bar.lbuy + bar.lsell }
        },
        {
          scaleGroup: 'volume',
          color: '#9c27b0'
        }
      )*/
    },

    /**
     * register serie and create serie api
     * @param {string} id serie id
     * @param {string} type serie type
     * @param {function} fn serie data handler
     * @param {any} options serie options
     */
    addSerie(id, type, fn, options = {}) {
      options = Object.assign({}, seriesOptions[type] || {}, options)

      const apiMethodName = 'add' + (type.charAt(0).toUpperCase() + type.slice(1)) + 'Series'

      const serie = {
        id,
        fn,
        type,
        options,
        api: chart[apiMethodName](options)
      }

      series.push(serie)

      this.series.push(id)
    },

    /**
     * remove series, destroy chart and cancel related events
     */
    destroyChart() {
      if (!chart) {
        return
      }

      for (let serie of series) {
        chart.removeSeries(serie.api)
      }

      series.splice(0, series.length)

      chart.unsubscribeCrosshairMove(this.onCrosshair)
      chart.unsubscribeClick(this.onClick)
      chart.unsubscribeVisibleTimeRangeChange(this.onPan)
      chart.remove()

      chart = null
    },

    /**
     * when timeframe is set
     * @return {number} timeframe
     */
    setTimeframe(timeframe) {
      this.logActivity(`[timeframe] change "${timeframe}"`)
      this.fetch(true)
    },

    /**
     * get the optimal range for realtime bars
     * @return {number} range
     */
    getRealtimeRange() {
      const optimalRange = this.getOptimalRangeLength()
      let to = +new Date() / 1000
      let from = Math.ceil(to / this.timeframe) * this.timeframe - optimalRange

      return { from, to, median: from + (to - from) / 2, incomplete: true }
    },

    /**
     * get optimal range (difference between to and from) based on current timeframe, container dimensions and bar width
     * @return {number} range
     */
    getOptimalRangeLength() {
      return Math.floor(((this.$refs.chartContainer.offsetWidth / 3) * this.timeframe) / this.timeframe) * this.timeframe
    },

    /**
     * get visible range (or optimal range if chart has no range)
     * @return {Range} range
     */
    getVisibleRange() {
      const visibleRange = chart.timeScale().getVisibleRange()

      if (visibleRange) {
        const scrollPosition = chart.timeScale().scrollPosition()
        if (scrollPosition > 0) {
          visibleRange.to = Math.floor((visibleRange.to + scrollPosition * this.timeframe) / this.timeframe) * this.timeframe
        }

        return { from: visibleRange.from, to: visibleRange.to, median: visibleRange.from + (visibleRange.to - visibleRange.from) / 2 }
      } else {
        return this.getRealtimeRange()
      }
    },

    getActiveBarSize() {
      return Math.max.apply(
        null,
        series.map(a => a.options.length || 0)
      )
    },

    getActiveBarLength() {
      var length = Math.min.apply(
        null,
        Object.keys(activeBar.series).map(a => (activeBar.series[a].average && activeBar.series[a].average.points.length) || Infinity)
      )

      if (isFinite(length)) {
        return length
      }

      return 0
    },

    /**
     * fetch whatever is missing based on visiblerange
     * @param {boolean} clear will clear the chart / initial fetch
     */
    fetch(clear) {
      if (!socket.canFetch()) {
        return Promise.reject('Fetch is disabled')
      }

      const visibleRange = this.getVisibleRange()
      let rangeToFetch

      if (clear) {
        rangeToFetch = this.getRealtimeRange()
        this.logActivity(`[fetch] from getRealtimeRange`, rangeToFetch)
      } else if (visibleRange.from === cacheRange.from) {
        rangeToFetch = {
          from: visibleRange.from - this.getOptimalRangeLength(),
          to: visibleRange.from
        }
        this.logActivity(`[fetch] left side`, { from: this.formatTime(rangeToFetch.from), to: this.formatTime(rangeToFetch.to) })
      } else if (false && visibleRange.to === cacheRange.to) {
        rangeToFetch = {
          from: visibleRange.to,
          to: visibleRange.to + this.getOptimalRangeLength()
        }
        this.logActivity(`[fetch] right side`, { from: this.formatTime(rangeToFetch.from), to: this.formatTime(rangeToFetch.to) })
      }

      if (!rangeToFetch) {
        return Promise.reject('Nothing to fetch')
      }

      if (clear) {
        this.preventImmediateRender = true
        this.clearData()
      }

      return socket
        .fetchHistoricalData(parseInt(rangeToFetch.from * 1000), parseInt(rangeToFetch.to * 1000 - 1))
        .then(({ data, from, to, format }) => {
          let chunk

          switch (format) {
            case 'point':
              chunk = {
                from,
                to,
                bars: data
              }
              break
            default:
              chunk = this.groupTradesIntoBars(data)
              break
          }

          if (chunk) {
            this.saveChunk(chunk)
          }

          this.logActivity(`[fetch] success (${data.length} new ${format}s)`)
          this.renderVisibleChunks()
        })
        .catch(err => {
          this.logActivity(`[fetch] ${err || 'unknown error'}`)
        })
        .then(() => {
          this.preventImmediateRender = false
          this.renderQueuedTrades()
        })
    },

    onClick(param) {
      const time = param.time;
      let trades = socket.getBarTrades(time)

      if (!trades) {
        trades = [];

        for (let i = 0; i < cache.length; i++) {
          if (time >= cache[i].from && time <= cache[i].to) {
            for (let j = 0; j < cache[i].bars.length; j++) {
              if (cache[i].bars[j].timestamp == time) {
                trades.push(cache[i].bars[j]);
              }
            }
          }
        }
      }

      
      console.log('trades at bar', time, ':')

      console.log(trades)

      console.log('\n')
    },

    /**
     * TV chart mousemove event
     * @param{TV.MouseEventParams} param tv mousemove param
     */
    onCrosshair(param) {
      if (
        param === undefined ||
        param.time === undefined ||
        param.point.x < 0 ||
        param.point.x > this.$refs.chartContainer.clientWidth ||
        param.point.y < 0 ||
        param.point.y > this.$refs.chartContainer.clientHeight
      ) {
        isCrosshairActive = false
      } else {
        isCrosshairActive = true

        for (let serie of series) {
          const data = param.seriesPrices.get(serie.api)

          if (!data) {
            continue
          }

          if (serie.type === 'candlestick') {
            this.$set(this.legend, serie.id, `open: ${data.open}, high: ${data.high}, low: ${data.low}, close: ${data.close}`)
          } else {
            this.$set(this.legend, serie.id, formatAmount(data))
          }
        }
      }
    },

    /**
     * @param{Trade[]} trades trades to process
     */
    onTrades(trades) {
      if (this.preventImmediateRender || this.chartRefreshRate) {
        if (trades.filter(a => !a).length) {
          debugger;
        }
        Array.prototype.push.apply(queuedTrades, trades)
        return
      }

      this.renderRealtimeTrades(trades)
    },

    /**
     * append or prepend chunk to cache array
     * and recalculate cacheRange
     * @param{Chunk} chunk Chunk to add
     */
    saveChunk(chunk) {
      this.logActivity(
        `[chart.saveChunk]`,
        this.formatTime(chunk.from),
        this.formatTime(chunk.to),
        Math.ceil((chunk.to - chunk.from) / this.timeframe) + ' bars'
      )

      let index

      if (!cache.length || cache[cache.length - 1].to <= chunk.from) {
        index = cache.push(chunk) - 1
      } else if (cache[0].from >= chunk.to) {
        cache.unshift(chunk)
        index = 0
      }

      if (index === 0) {
        cacheRange.from = chunk.from
      }

      if (index === cache.length - 1) {
        cacheRange.to = chunk.to
      }

      this.dumpVariable('cacheRange')
      this.dumpVariable('chunks')

      if (typeof index !== 'undefined') {
        this.logActivity(`[saveChunk] new cache range`, this.formatTime(cacheRange.from), ' -> ', this.formatTime(cacheRange.to))
      } else {
        this.logActivity(
          `[saveChunk] couldn't save chunk\n\t`,
          '- cachedRange [from: ' + this.formatTime(cacheRange.from),
          ' -> to: ',
          this.formatTime(cacheRange.to) + ']\n\t',
          '- chunk range [from: ' + this.formatTime(chunk.from),
          ' -> to: ',
          this.formatTime(chunk.to) + ']'
        )
        debugger
      }
    },

    /**
     * @param {Bar?} referenceBar take this bar as reference (last bar) for the new chart
     */
    clearChart(referenceBar) {
      for (let serie of series) {
        this.clearSerie(serie)
      }
    },

    clearData() {
      this.logActivity(`[chart] clearData`)

      cache.splice(0, cache.length)
      cacheRange.from = cacheRange.to = renderedRange.from = renderedRange.to = null

      this.clearQueue()
      this.setupQueue()

      activeBar = this.newBar(Math.floor(+new Date() / 1000 / this.timeframe) * this.timeframe)

      this.dumpVariable('chunks')
      this.dumpVariable('renderedRange')
      this.dumpVariable('cacheRange')
      this.dumpVariable('visibleRange')
    },

    /**
     * @param {Serie} serie serie to clear
     */
    clearSerie(serie) {
      // this.logActivity(`[chart] clearSerie ${serie.id}`)
      serie.api.setData([])
    },

    /**
     * render realtime trade and store bar(s)
     * @param {Trade[]} trades trades to render
     */
    renderRealtimeTrades(trades) {
      const seriesData = []

      if (!trades.length) {
        return
      }

      let canRender = !activeChunk || activeChunk.rendered

      let i = 0

      for (i; i < trades.length; i++) {
        const trade = trades[i]
        const timestamp = Math.floor(trade.timestamp / 1000 / this.timeframe) * this.timeframe

        if (!activeBar || activeBar.timestamp < timestamp) {
          if (activeBar) {
            if (!activeChunk) {
              // first time storing bar from realtime trades
              this.logActivity(`\t -> create active chunk from new bar`)
              const visibleRange = this.getVisibleRange()

              canRender = activeBar.timestamp >= visibleRange.from && activeBar.timestamp <= visibleRange.to

              activeChunk = {
                from: activeBar.timestamp,
                to: activeBar.timestamp,
                active: true,
                rendered: canRender,
                bars: []
              }

              this.saveChunk(activeChunk)
            }

            if (canRender && activeBar.hasData) {
              seriesData.push(this.formatBar(activeBar, false))
            }

            // feed activeChunk with active bar exchange snapshot
            for (let exchange in activeBar.exchanges) {
              if (activeBar.exchanges[exchange].hasData) {
                activeChunk.bars.push(this.cloneBar(activeBar.exchanges[exchange], activeBar.timestamp))
              }
            }

            activeChunk.to = cacheRange.to = activeBar.timestamp

            if (canRender && renderedRange.to < activeBar.timestamp) {
              renderedRange.to = activeBar.timestamp
            }

            this.dumpVariable('chunks')
          }

          activeBar = this.newBar(timestamp, activeBar)
        }

        const amount = trade.price * trade.size

        if (!activeBar.exchanges[trade.exchange]) {
          activeBar.exchanges[trade.exchange] = {
            exchange: trade.exchange,
            close: +trade.price
          }

          this.resetBar(activeBar.exchanges[trade.exchange])
        }

        activeBar.exchanges[trade.exchange].hasData = true

        if (trade.liquidation) {
          activeBar.exchanges[trade.exchange]['l' + trade.side] += amount
          continue
        }

        activeBar.exchanges[trade.exchange].high = Math.max(activeBar.exchanges[trade.exchange].high, +trade.price)
        activeBar.exchanges[trade.exchange].low = Math.min(activeBar.exchanges[trade.exchange].low, +trade.price)
        activeBar.exchanges[trade.exchange].close = +trade.price

        activeBar.exchanges[trade.exchange]['c' + trade.side]++
        activeBar.exchanges[trade.exchange]['v' + trade.side] += amount

        if (this.actives.indexOf(trade.exchange) !== -1) {
          activeBar['v' + trade.side] += amount
          activeBar['c' + trade.side]++
          activeBar.hasData = true
        }
      }

      this.dumpVariable('activeBar')

      if (canRender && activeBar.hasData) {
        seriesData.push(this.formatBar(activeBar, false))

        if (renderedRange.to < activeBar.timestamp) {
          renderedRange.to = activeBar.timestamp
          
          this.preventPan()
        }
      }

      for (let i = 0; i < seriesData.length; i++) {
        this.updateBar(seriesData[i])
      }

      this.dumpVariable('renderedRange')
    },

    /**
     * make bars from trades based on current timeframe
     * @param {Trade[]} trades trades to group
     */
    groupTradesIntoBars(trades) {
      if (!trades.length) {
        return
      }

      let bar = {
        timestamp: null,
        exchanges: {}
      }

      let exchangesCount = 0
      const enabledExchanges = Object.keys(this.exchanges).filter(a => !this.exchanges[a].disabled)

      for (let i = 0; i < trades.length; i++) {
        if (!bar.exchanges[trades[i][0]] && enabledExchanges.indexOf(trades[i][0]) !== -1) {
          exchangesCount++
          bar.exchanges[trades[i][0]] = {
            exchange: trades[i][0],
            close: +trades[i][2]
          }

          this.resetBar(bar.exchanges[trades[i][0]])
          if (exchangesCount === enabledExchanges.length) {
            break
          }
        }
      }

      if (exchangesCount !== enabledExchanges.length) {
        this.logActivity(`[groupTradesIntoBars] couldn't find all exchange's first price (${trades.length} processed)`)
      }

      const bars = []

      // loop through bars in range
      for (let j = 0; j <= trades.length; j++) {
        const timestamp = trades[j] ? Math.floor(trades[j][1] / 1000 / this.timeframe) * this.timeframe : Infinity

        if (bar.timestamp < timestamp) {
          if (bar.timestamp && activeBar && bar.timestamp > activeBar.timestamp) {
            debugger
          }
          for (let exchange in bar.exchanges) {
            if (bar.timestamp && bar.exchanges[exchange].hasData) {
              bars.push(this.cloneBar(bar.exchanges[exchange], bar.timestamp))
              this.resetBar(bar.exchanges[exchange])
            }
          }

          if (!trades[j]) {
            break
          }

          bar.timestamp = timestamp
        }

        const exchange = trades[j][0]

        if (!bar.exchanges[exchange]) {
          continue
        }

        const side = trades[j][4] > 0 ? 'buy' : 'sell'

        bar.exchanges[exchange].hasData = true

        bar.exchanges[exchange].high = Math.max(bar.exchanges[exchange].high, +trades[j][2])
        bar.exchanges[exchange].low = Math.min(bar.exchanges[exchange].low, +trades[j][2])
        bar.exchanges[exchange].close = +trades[j][2]

        if (trades[j][5] === 1) {
          bar.exchanges[exchange]['l' + side] += trades[j][3] * trades[j][2]
          continue
        }

        bar.exchanges[exchange]['c' + side]++
        bar.exchanges[exchange]['v' + side] += trades[j][3] * trades[j][2]
      }

      const from = Math.floor(bars[0].timestamp / this.timeframe) * this.timeframe
      const to = Math.floor(bars[bars.length - 1].timestamp / this.timeframe) * this.timeframe
      const median = from + (to - from) / 2

      const chunk = { from, to, median, bars }

      const lastTimestamp = trades[trades.length - 1][1] / 1000

      return { from, to, median, bars, lastTimestamp }
    },

    /**
     * push bar content into active bar
     * @param {Bar} bar bar to merge into activeBar
     */
    mergeIntoActiveBar(bar) {
      activeBar = bar
    },

    /**
     * @param {Bar} bar do copy
     */
    cloneBar(bar, timestamp) {
      return {
        exchange: bar.exchange,
        timestamp: timestamp || bar.timestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        vbuy: bar.vbuy,
        vsell: bar.vsell,
        cbuy: bar.cbuy,
        csell: bar.csell,
        lbuy: bar.lbuy,
        lsell: bar.lsell
      }
    },

    /**
     * @param {Bar[]} bars bars to render
     */
    renderBars(bars) {
      if (!bars.length) {
        return
      }

      const seriesData = []

      // temporary active bar!
      let temporaryActiveBar

      for (let i = 0; i <= bars.length; i++) {
        const bar = bars[i]

        if (!bar || !temporaryActiveBar || bar.timestamp > temporaryActiveBar.timestamp) {
          if (temporaryActiveBar && temporaryActiveBar.hasData) {
            seriesData.push(this.formatBar(temporaryActiveBar))
          }

          if (!bar) {
            break
          }

          temporaryActiveBar = this.newBar(bar.timestamp, temporaryActiveBar)
        }

        if (this.actives.indexOf(bar.exchange) === -1) {
          continue
        }

        temporaryActiveBar.hasData = true
        temporaryActiveBar.vbuy += bar.vbuy
        temporaryActiveBar.vsell += bar.vsell
        temporaryActiveBar.cbuy += bar.cbuy
        temporaryActiveBar.csell += bar.csell
        temporaryActiveBar.lbuy += bar.lbuy
        temporaryActiveBar.lsell += bar.lsell

        temporaryActiveBar.exchanges[bar.exchange] = this.cloneBar(bar)
      }

      const rightEdgeTime = renderedRange.to || bars[bars.length - 1].timestamp

      if (!bars.length) {
        renderedRange.from = renderedRange.to = null
      } else {
        renderedRange.from = bars[0].timestamp
        renderedRange.to = bars[bars.length - 1].timestamp
      }

      const edgeOffset = (renderedRange.to - rightEdgeTime) / this.timeframe
      const scrollPosition = chart.timeScale().scrollPosition()

      this.clearChart()
      this.replaceData(seriesData)
      chart.timeScale().scrollToPosition(scrollPosition - edgeOffset)

      this.logActivity(
        '[renderBars]',
        `mergeIntoActiveBar`,
        temporaryActiveBar ? this.formatTime(temporaryActiveBar.timestamp) : 'no temporary bar',
        activeBar ? this.formatTime(activeBar.timestamp) : 'no active bar'
      )

      this.mergeIntoActiveBar(temporaryActiveBar)

      return temporaryActiveBar
    },

    renderVisibleChunks() {
      const visibleRange = this.getVisibleRange()

      let bars = []

      this.logActivity('[renderVisibleChunks]', `from: ${this.formatTime(visibleRange.from)} -> to: ${this.formatTime(visibleRange.to)}`)

      for (let chunk of cache) {
        if (
          (chunk.from >= visibleRange.from && chunk.from <= visibleRange.to) ||
          (chunk.to >= visibleRange.from && chunk.to <= visibleRange.to) ||
          (chunk.from <= visibleRange.from && chunk.to <= visibleRange.to)
        ) {
          let reasons = []

          if (chunk.from >= visibleRange.from && chunk.from <= visibleRange.to) {
            reasons.push('start of chunk visible')
          }
          if (chunk.to >= visibleRange.from && chunk.to <= visibleRange.to) {
            reasons.push('end of chunk visible')
          }
          if (chunk.from <= visibleRange.from && chunk.to <= visibleRange.to) {
            reasons.push('larger than (or equal to) view')
          }
          this.logActivity(
            `[renderVisibleChunks] select chunk ${chunk.active ? '(active chunk)' : ''} n°${cache.indexOf(chunk)} from: ${this.formatTime(
              chunk.from
            )} -> to: ${this.formatTime(chunk.to)}\n\t->${reasons}`
          )
          bars = bars.concat(chunk.bars)
          chunk.rendered = true
        } else {
          chunk.rendered = false
          this.logActivity(
            `[renderVisibleChunks] ignore chunk ${chunk.active ? '(active chunk)' : ''} n°${cache.indexOf(chunk)} from: ${this.formatTime(
              chunk.from
            )} -> to: ${this.formatTime(chunk.to)}`
          )
        }
      }

      this.dumpVariable('chunks')

      this.renderBars(bars)
    },

    /**
     * @param {Bar | ActiveBar} bar bar to clear for next timestamp
     */
    resetBar(bar) {
      bar.open = bar.close
      bar.high = bar.close
      bar.low = bar.close
      bar.close = bar.close
      bar.vbuy = 0
      bar.vsell = 0
      bar.cbuy = 0
      bar.csell = 0
      bar.lbuy = 0
      bar.lsell = 0
      bar.hasData = false

      if (bar.exchanges) {
        for (let exchange in bar.exchanges) {
          this.resetBar(bar.exchanges[exchange])
        }
      }
    },

    /**
     * prepare bar for next timestamp
     * @param {number} timestamp timestamp of the next bar
     * @param {Bar?} referenceBar bar to use as reference
     * @param {string?} type type of the bar either 'realtime' or 'chunk'
     */

    newBar(timestamp, referenceBar) {
      if (referenceBar) {
        if (referenceBar.timestamp < timestamp) {
          if (referenceBar.hasData) {
            for (let serie of series) {
              const serieData = referenceBar.series[serie.id]

              if (serieData.point) {
                serieData.value = serieData.point.value || serieData.point.close
              }

              if (serieData && serieData.average) {
                serieData.average.count = serieData.average.points.push(serieData.point.value)

                if (serieData.average.count > serie.options.length) {
                  serieData.average.sum -= serieData.average.points.shift()
                  serieData.average.count--
                }

                serieData.average.sum += serieData.point.value
              }
            }
          }

          referenceBar.timestamp = timestamp

          this.resetBar(referenceBar)
        } else if (referenceBar.timestamp === timestamp) {
          // debugger
        } else if (referenceBar.timestamp > timestamp) {
          debugger
        } else {
          debugger
        }
      } else {
        referenceBar = {
          timestamp: timestamp,
          series: {},
          exchanges: {},
          open: null,
          high: null,
          low: null,
          close: null,
          vbuy: 0,
          vsell: 0,
          cbuy: 0,
          csell: 0,
          lbuy: 0,
          lsell: 0
        }

        for (let serie of series) {
          referenceBar.series[serie.id] = {
            value: null
          }

          if (serie.options.ema || serie.options.sma) {
            referenceBar.series[serie.id].average = {
              points: [],
              count: 0,
              sum: 0
            }
          }
        }
      }

      return referenceBar
    },

    /**
     * Attach marker to serie
     * @param {Serie} serie serie
     */
    setMarkers(serie, marker) {
      if (!serie.markers) {
        serie.markers = []
      }

      for (let i = serie.markers.length - 1; i >= 0; i--) {
        if (serie.markers[i].time === marker.time) {
          serie.markers.splice(i, 1)
          break
        }
      }

      serie.markers.push(marker)

      setTimeout(() => {
        serie.api.setMarkers(serie.markers)
      }, 100)
    },

    /**
     * disable "fetch on pan" until current operation (serie.update / serie.setData) is finished
     */
    preventPan() {
      if (this.panPrevented) {
        return
      }

      if (typeof this._releasePanTimeout !== 'undefined') {
        clearTimeout(this._releasePanTimeout)
      }

      this.panPrevented = true

      this._releasePanTimeout = window.setTimeout(() => {
        this.panPrevented = false
      }, 100)
    },

    /**
     * replace whole chart with a set of bars
     * @param {Bar[]} bars bars to render
     */
    replaceData(bars) {
      this.preventPan()

      const seriesData = {}

      for (let bar of bars) {
        for (let id in bar) {
          if (!seriesData[id]) {
            seriesData[id] = []
          }

          if (bar[id]) {
            seriesData[id].push(bar[id])
          }
        }
      }

      for (let serie of series) {
        if (seriesData[serie.id] && seriesData[serie.id].length) {
          serie.api.setData(seriesData[serie.id])
        }
      }
    },

    /**
     * update last or add new bar to chart
     * @param {Bar} bar
     */
    updateBar(bar) {
      for (let serie of series) {
        if (bar[serie.id]) {
          serie.api.update(bar[serie.id])

          if (!isCrosshairActive) {
            if (bar[serie.id].open) {
              this.$set(
                this.legend,
                serie.id,
                `open: ${formatPrice(bar[serie.id].open)}, high: ${formatPrice(bar[serie.id].high)}, low: ${formatPrice(
                  bar[serie.id].low
                )}, close: ${formatPrice(bar[serie.id].close)}`
              )
            } else {
              this.$set(this.legend, serie.id, formatAmount(bar[serie.id].value))
            }
          }
        }
      }
    },

    /**
     * get 1 ohlc bar out of actives exchanges in bar
     * simple average
     * @param {Bar} bar
     */
    getExchangesAveragedOHLC(bar) {
      let totalWeight = 0
      let setOpen = false

      if (bar.open === null) {
        setOpen = true
        bar.open = 0
      }

      let high = 0
      let low = 0

      bar.high = 0
      bar.low = 0
      bar.close = 0

      for (let exchange in bar.exchanges) {
        if (this.actives.indexOf(exchange) === -1) {
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
    },

    /**
     * get valid TV series points from bar
     * @param {Bar} bar
     */
    formatBar(bar, log = true) {
      const points = {}

      for (let serie of series) {
        if (!bar.series[serie.id]) {
          bar.series[serie.id] = {}
        }

        const serieData = bar.series[serie.id]

        serieData.point = serie.fn(bar)

        if (serie.options.ema) {
          serieData.point.value = this.getEma(serieData.point.value, serieData.average.points, serie.options.length)

          if (serieData.average.count + 1 < serie.options.length) {
            continue
          }
        } else if (serie.options.sma) {
          serieData.point.value = (serieData.average.sum + serieData.point.value) / (serieData.average.count + 1)

          if (serieData.average.count + 1 < serie.options.length) {
            continue
          }
        }

        if (serieData.point.value || serieData.point.open) {
          points[serie.id] = { time: bar.timestamp, ...serieData.point }
        }
      }

      return points
    },

    /**
     * get ema
     * @param {number} value last value
     * @param {number[]} values last emas values
     * @param {number} length ema length
     */
    getEma(value, values = [], length) {
      const k = 2 / (length + 1)

      if (values.length > 0) {
        return (value - values[values.length - 1]) * k + values[values.length - 1]
      } else {
        return value
      }
    },

    /**
     * on click on height handler
     * @param {MouseEvent} event mousedown event
     */
    startManualResize(event, side) {
      if (event.which === 3) {
        return
      }

      if (!this._doManualResize) {
        this._doManualResize = this.doManualResize.bind(this)

        window.addEventListener('mousemove', this._doManualResize, false)
      }

      if (!this._stopManualResize) {
        this._stopManualResize = this.stopManualResize.bind(this)

        window.addEventListener('mouseup', this._stopManualResize, false)
      }

      if (side === 'height') {
        this.resizing[side] = event.pageY
      } else {
        this.resizing[side] = event.pageX
      }

      this.panPrevented = true
    },

    /**
     * on drag height handler
     * @param {MouseEvent} event mousemove event
     */
    doManualResize(event) {
      if (!isNaN(this.resizing.width)) {
        let referenceWidth

        if (this.sidebarWidth !== null) {
          referenceWidth = window.innerWidth - this.sidebarWidth
        } else {
          referenceWidth = chart.options().width
        }

        this.refreshChartDimensions(referenceWidth + (event.pageX - this.resizing.width))
      } else if (!isNaN(this.resizing.height)) {
        this.refreshChartDimensions(null, (this.chartHeight || chart.options().height) + (event.pageY - this.resizing.height))
      }
    },

    /**
     * on end of drag height handler
     * @param {MouseEvent} event mouseup event
     */
    stopManualResize(event) {
      if (this.resizing.width) {
        this.$store.commit('setSidebarWidth', window.innerWidth - this.$refs.chartContainer.clientWidth)

        delete this.resizing.width
      } else if (this.resizing.height) {
        this.$store.commit('setChartHeight', this.$refs.chartContainer.clientHeight)

        delete this.resizing.height
      }

      if (this._doManualResize) {
        window.removeEventListener('mousemove', this._doManualResize)
        delete this._doManualResize
      }

      if (this._stopManualResize) {
        window.removeEventListener('mouseup', this._stopManualResize)
        delete this._stopManualResize
      }

      this.panPrevented = false
    },

    /**
     * on dblclick on height handler
     * @param {MouseEvent} event dbl click event
     */
    resetHeight(event) {
      delete this.resizing.height

      this.$store.commit('setChartHeight', null)

      this.refreshChartDimensions()
    },

    /**
     * on dblclick on width handler
     * @param {MouseEvent} event dbl click event
     */
    resetWidth(event) {
      delete this.resizing.width

      this.$store.commit('setSidebarWidth', null)

      this.refreshChartDimensions()
    },

    /**
     * refresh chart dimensions based on container dimensions
     */
    refreshChartDimensions(width, height) {
      if (!chart) {
        return
      }

      const size = this.getChartSize()

      chart.resize(width || size.width, height || size.height)
    },

    /**
     * get chart height based on container dimensions
     */
    getChartSize() {
      const w = document.documentElement.clientWidth
      const h = document.documentElement.clientHeight

      return {
        width: window.innerWidth < 768 ? this.$el.clientWidth : this.sidebarWidth > 0 ? window.innerWidth - this.sidebarWidth : w * 0.75,
        height:
          window.innerWidth >= 768
            ? this.$el.clientHeight
            : this.chartHeight > 0
            ? this.chartHeight
            : +Math.min(w / 2, Math.max(300, h / 3)).toFixed()
      }
    },

    /**
     * on browser resize
     * @param {Event} event resize event
     */
    doWindowResize(event) {
      clearTimeout(this._resizeTimeout)

      this._resizeTimeout = setTimeout(() => {
        this.refreshChartDimensions()
      }, 250)
    },

    /**
     * on chart pan
     */
    onPan() {
      if (!chart.timeScale().getVisibleRange()) {
        return
      }

      this.dumpVariable('visibleRange')

      if (this.panPrevented) {
        return
      }

      if (this._onPanTimeoutId) {
        clearTimeout(this._onPanTimeoutId)
        this._onPanTimeoutId = null
      }

      this._onPanTimeoutId = setTimeout(() => {
        if (cacheRange.from === null) {
          return
        }

        const visibleRange = this.getVisibleRange()

        if (visibleRange.from <= cacheRange.from) {
          this.logActivity('[pan] visibleRange.from <= cacheRange.from')
          this.panPrevented = true
          this.fetch().then(() => {
            this.panPrevented = false
          })
        } else if (
          (visibleRange.from <= renderedRange.from && cacheRange.from <= renderedRange.from) ||
          (visibleRange.to >= renderedRange.to && cacheRange.to >= renderedRange.to)
        ) {
          if (visibleRange.from <= renderedRange.from && cacheRange.from <= renderedRange.from) {
            this.logActivity('[pan] visibleRange.from <= renderedRange.from && cacheRange.from <= renderedRange.from')
          }
          if (visibleRange.to >= renderedRange.to && cacheRange.to >= renderedRange.to) {
            this.logActivity('[pan] visibleRange.to >= renderedRange.to && cacheRange.to >= renderedRange.to')
          }
          this.renderVisibleChunks()
        }
      }, 200)
    },

    formatTime(time) {
      const date = new Date(time * 1000)

      return date.getDate() + '/' + (date.getMonth() + 1) + ' ' + date.toTimeString().split(' ')[0]
    },

    logActivity() {
      const args = Array.prototype.slice.call(arguments)

      this.activities.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '))

      console.log(this.activities[this.activities.length - 1])

      if (this.activities.length === 20) {
        this.activities.splice(0, 1)
      }
    },

    dumpVariable(name) {
      if (!this.debug) {
        return
      }

      switch (name) {
        case 'activeBar':
          this.candledump = JSON.stringify(
            Object.assign({}, activeBar, { timestamp: `${new Date(activeBar.timestamp * 1000).toUTCString()} (${activeBar.timestamp})` }),
            null,
            2
          )
          break
        case 'chunks':
          this.chunks = cache
            .map(
              (a, i) =>
                `chunk#${i} (${a.rendered ? 'RENDERED' : 'IGNORED'}${a.active ? ', ACTIVE' : ''})\n\t${this.formatTime(a.from)} -> ${this.formatTime(
                  a.to
                )} (${getHms((a.to - a.from + this.timeframe) * 1000)})`
            )
            .join('\n')
          break
        case 'renderedRange':
          this.renderedRange = `from: ${renderedRange.from ? this.formatTime(renderedRange.from) : 'n/a'}, to: ${
            renderedRange.to ? this.formatTime(renderedRange.to) : 'n/a'
          }`
          break
        case 'cacheRange':
          this.cacheRange = `from: ${cacheRange.from ? this.formatTime(cacheRange.from) : 'n/a'}, to: ${
            cacheRange.to ? this.formatTime(cacheRange.to) : 'n/a'
          }`
          break
        case 'visibleRange':
          const visibleRange = this.getVisibleRange()

          if (!visibleRange) {
            this.visibleRange = 'N/A'
          } else {
            this.visibleRange = `from: ${visibleRange.from ? this.formatTime(visibleRange.from) : 'n/a'}, to: ${
              visibleRange.to ? this.formatTime(visibleRange.to) : 'n/a'
            }`
          }
          break
      }
    },

    setupQueue() {
      if (this._renderQueuedTradesInterval || !this.chartRefreshRate) {
        return
      }
      console.info('setup queue', getHms(this.chartRefreshRate))

      this._renderQueuedTradesInterval = setInterval(() => {
        if (!this.preventImmediateRender) {
          this.renderQueuedTrades()
        }
      }, this.chartRefreshRate)
    },

    clearQueue() {
      if (!this._renderQueuedTradesInterval) {
        return
      }
      console.info('clearQueue')

      clearInterval(this._renderQueuedTradesInterval)
      delete this._renderQueuedTradesInterval

      this.renderQueuedTrades()
    },

    renderQueuedTrades() {
      if (!queuedTrades.length) {
        return
      }

      this.renderRealtimeTrades(queuedTrades)
      queuedTrades.splice(0, queuedTrades.length)
    }
  }
}
</script>

<style lang="scss">
@import '../../assets/sass/variables';

#chart {
  position: relative;
}

.chart__container {
  position: relative;
  width: calc(100% + 1px);

  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  &.-fetching {
    opacity: 0.5;
  }
}

.chart__handler {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;

  &.-width {
    top: 0;
    left: auto;
    width: 16px;
    margin-right: -8px;
    cursor: ew-resize;
    display: none;

    @media screen and (min-width: 768px) {
      display: block;
    }
  }

  &.-height {
    height: 8px;
    margin-top: -4px;
    cursor: row-resize;

    @media screen and (min-width: 768px) {
      display: none;
    }
  }
}

.chart {
  &__legend {
    position: absolute;
    top: 1em;
    left: 1em;
    font-family: monospace;
  }

  &__debug {
    direction: rtl;
    position: absolute;
    top: 0;
    z-index: 10000;
    opacity: 0.25;
    font-size: 1em;
    line-height: 1;
    bottom: 0;
    overflow: auto;
    width: 40%;
    font-family: monospace;

    &::-webkit-scrollbar {
      width: 12px;
      background-color: rgba(black, 0.5);
    }

    &::-webkit-scrollbar-thumb {
      -webkit-box-shadow: inset 0 0 0 1px white;
      box-shadow: inset 0 0 0 1px white;
    }

    &-container {
      direction: ltr;
    }

    &.-right {
      right: 0;
      text-align: right;
      direction: ltr;
      bottom: auto;
      padding-right: 5em;
    }

    &.-bottom {
      top: auto;
      bottom: 0;
    }

    &:hover {
      opacity: 1;
      background-color: rgba(0, 0, 0, 0.5);
    }
  }
}
</style>
