<template>
  <div id="chart">
    <div class="chart__container" ref="chartContainer"></div>

    <div
      class="chart__height-handler"
      ref="chartHeightHandler"
      @mousedown="startResize"
      @dblclick.stop.prevent="resetHeight"
    ></div>
    <div class="chart__debug" v-if="debug">
      <div class="chart__debug-container">
        <div
          v-for="(serie, index) in series"
          :key="index"
          class="chart-serie"
        >{{ serie }} {{ legend[serie] }}</div>
        <pre>{{ candledump }}</pre>
      </div>
    </div>
    <div class="chart__debug -right" v-if="debug">
      <div class="chart__debug-container">
        <pre>visible range: {{ visibleRange }}</pre>
        <pre>rendrered range: {{ renderedRange }}</pre>
        <pre>cache range: {{ cacheRange }}</pre>
        <pre>chunks:<br />{{ chunks }}</pre>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import socket from '../../services/socket'
import { chartOptions, seriesOptions, histogramOptions } from './options'

import * as TV from 'lightweight-charts'

/** @type {TV.IChartApi} */
let chart

/**
 * @type Serie[]
 */
const series = []

/**
 * @type Bar
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

const cacheRange = { from: null, to: null }
const renderedRange = { from: null, to: null }
let isCrosshairActive = false

/**
 * @typedef {[
 *  string,
 *  number,
 *  number,
 *  number,
 *  number,
 * ]} Trade
 */

/**
 * @typedef {{
 *  from: number,
 *  to: number
 * }} Range
 */

/**
 * @typedef {{
 *  open: number,
 *  high: number,
 *  low: number,
 *  close: number,
 *  vbuy: number,
 *  vsell: number,
 *  cbuy: number,
 *  csell: number,
 *  lbuy: number,
 *  lsell: number,
 * }} ExchangeBar
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
 *  exchanges: {[name: string]: ExchangeBar},
 *  vbuy: number,
 *  vsell: number,
 *  cbuy: number,
 *  csell: number,
 *  lbuy: number,
 *  lsell: number,
 * }} Bar
 */

window.getRealTimeChunk = function() {
  if (!cache.length || !cache[cache.length - 1].active) {
    return null
  }

  return cache[cache.length - 1]
}
window.getCache = function() {
  return cache
}
export default {
  data() {
    return {
      panning: false,
      fetching: false,
      legend: {},
      series: [],
      candledump: '',
      renderedRange: '',
      cacheRange: '',
      visibleRange: '',
      chunks: ''
    }
  },
  computed: {
    ...mapState([
      'debug',
      'pair',
      'timeframe',
      'actives',
      'exchanges',
      'isSnaped',
      'chartAutoScale',
      'chartHeight',
      'chartRange',
      'chartCandleWidth',
      'chartLiquidations',
      'chartCandlestick',
      'chartPadding',
      'chartGridlines',
      'chartGridlinesGap',
      'chartSma',
      'chartSmaLength',
      'chartVolume',
      'chartVolumeThreshold',
      'chartVolumeOpacity',
      'chartVolumeAverage',
      'chartVolumeAverageLength'
    ])
  },
  created() {
    socket.$on('trades.instant', this.onTrades)

    socket.$on('clean', this.onClean)

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'reloadExchangeState':
          this.renderVisibleChunks()
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
      }
    })
  },
  mounted() {
    console.log(`[chart.mounted]`)

    this.createChart()

    this._doResize = this.doResize.bind(this)

    window.addEventListener('resize', this._doResize, false)

    this._doDrag = this.doDrag.bind(this)

    window.addEventListener('mousemove', this._doDrag, false)

    this._stopDrag = this.stopDrag.bind(this)

    window.addEventListener('mouseup', this._stopDrag, false)

    this.setTimeframe(this.timeframe)
  },
  beforeDestroy() {
    this.destroyChart()

    socket.$off('trades.instant', this.onTrades)

    socket.$off('clean', this.onClean)

    window.removeEventListener('resize', this._doResize)
    window.removeEventListener('mousemove', this._doDrag)
    window.removeEventListener('mouseup', this._stopDrag)

    this.onStoreMutation()
  },
  methods: {
    /**
     * create the chart, subscribe to chart events and register series
     */
    createChart() {
      this.destroyChart()

      const options = Object.assign({}, chartOptions, this.getChartSize())

      chart = TV.createChart(this.$refs.chartContainer, options)
      chart.subscribeCrosshairMove(this.onCrosshair)
      chart.subscribeClick(this.onClick)
      chart.subscribeVisibleTimeRangeChange(this.onPan)

      window.tvchart = chart

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
      console.log(`[chart.setTimeframe]`, timeframe)
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

      return { from, to, median: from + (to - from) / 2 }
    },

    /**
     * get optimal range (difference between to and from) based on current timeframe, container dimensions and bar width
     * @return {number} range
     */
    getOptimalRangeLength() {
      return (this.timeframe * Math.floor((this.$refs.chartContainer.offsetWidth - 20 * 0.1) / this.chartCandleWidth)) / 2
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

    /**
     * fetch whatever is missing based on visiblerange
     * @param {boolean} clear will clear the chart / initial fetch
     */
    fetch(clear) {
      console.log(`[chart.fetch] ${clear ? 'CLEAR=TRUE' : ''}`)

      const visibleRange = this.getVisibleRange()

      let rangeToFetch

      if (clear) {
        rangeToFetch = this.getRealtimeRange()
        console.log('get realtime range: from', this.formatTime(rangeToFetch.from), 'to', this.formatTime(rangeToFetch.to))
      } else if (visibleRange.from === cacheRange.from) {
        console.log('fetch left (prev)!')
        rangeToFetch = {
          from: visibleRange.from - this.getOptimalRangeLength(),
          to: visibleRange.from
        }
      } else if (false && visibleRange.to === cacheRange.to) {
        console.log('fetch right (next)!')
        rangeToFetch = {
          from: visibleRange.to,
          to: visibleRange.to + this.getOptimalRangeLength()
        }
      }

      if (!rangeToFetch) {
        console.log(`[chart.fetch] unable to get range to fetch`)
        return Promise.resolve(false)
      }

      console.log('rangeToFetch', this.formatTime(rangeToFetch.from), this.formatTime(rangeToFetch.to))

      if (clear) {
        console.log('<!> CLEAR <!>')
        this.clearData()
      }

      return socket.fetchHistoricalData(parseInt(rangeToFetch.from * 1000), parseInt(rangeToFetch.to * 1000 - 1)).then(({ data, format }) => {
        if (!data) {
          console.log(`[chart.fetch] no data ..`)
          return false
        }

        if (format !== 'trade') {
          console.log(`[chart.fetch] format "${format}" not supported, sorry`)
          return false
        }

        console.log(`[chart.fetch] done fetching (${data.length} new ${format}s)`)

        const chunk = this.groupTradesIntoBars(data)
        this.saveChunk(chunk)
        this.renderVisibleChunks()
      })
    },

    /**
     * TV chart click event
     * @param{TV.MouseEventParams} param tv mousemove param
     */
    onClick(param) {
      return
      console.log(param)

      if (!this.legend) {
        return
      }

      navigator.clipboard.writeText(this.legend.replace(/<br>/g, '\n').replace(/\./g, ',')).then(
        function() {
          console.log('Async: Copying to clipboard was successful!')
        },
        function(err) {
          console.error('Async: Could not copy text: ', err)
        }
      )
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
            this.$set(this.legend, serie.id, this.$root.formatAmount(data))
          }
        }
      }
    },

    /**
     * @param{Trade[]} trades trades to process
     */
    onTrades(trades) {
      this.renderRealtimeTrades(trades)
    },

    /**
     * append or prepend chunk to cache array
     * and recalculate cacheRange
     * @param{Chunk} chunk Chunk to add
     */
    saveChunk(chunk) {
      console.log(`[chart.saveChunk]`, chunk)

      let index

      if (!cache.length || cache[cache.length - 1].to <= chunk.from) {
        if (cache.length && cache[cache.length - 1].to === chunk.from) {
          console.log('shrink previous chunk by merging last bar of last cached chunk into first bar of new chunk')
          console.log(
            'last bar of last cached chunk (to be merged into new chunk and removed)',
            cache[cache.length - 1].bars[cache[cache.length - 1].bars.length - 1]
          )
          console.log('first bar of new chunk', chunk.bars[0])
          this.mergeBarIntoBar(cache[cache.length - 1].bars[cache[cache.length - 1].bars.length - 1], chunk.bars[0])
          cache[cache.length - 1].bars.pop()
          cache[cache.length - 1].to -= this.timeframe
        }
        index = cache.push(chunk) - 1
      } else if (cache[0].from >= chunk.to) {
        if (cache[0].from === chunk.to) {
          console.log('shrink new chunk by merging last bar of new chunk into first cached first bar of first cached chunk')
          console.log('last bar of new chunk (to be merged into first cached chunk and removed)', chunk.bars[chunk.bars.length - 1])
          console.log('first bar of first cached chunk', cache[0].bars[0])
          this.mergeBarIntoBar(chunk.bars[chunk.bars.length - 1], cache[0].bars[0])
          chunk.to -= this.timeframe
          chunk.bars.pop()
        }
        cache.unshift(chunk)
        index = 0
      }

      if (index === 0) {
        console.log(`[chart.saveChunk] inserted chunk LEFT (from: ${this.formatTime(chunk.from)} -> to: ${this.formatTime(chunk.to)})`)
        cacheRange.from = chunk.from
      }

      if (index === cache.length - 1) {
        console.log(`[chart.saveChunk] inserted chunk RIGHT (from: ${this.formatTime(chunk.from)} -> to: ${this.formatTime(chunk.to)})`)
        cacheRange.to = chunk.to
      }

      this.dump('cacheRange')
      this.dump('chunks')

      if (typeof index !== 'undefined') {
        console.log(
          `[chart.saveChunk] saved chunk at index ${index}\n\tupdated cacheRange (from: ${this.formatTime(cacheRange.from)} -> to: ${this.formatTime(
            cacheRange.to
          )})`
        )
      } else {
        console.log(`[chart.saveChunk] saved nothing!`)
        debugger
      }

      if (chunk.active) {
        if (activeChunk) {
          debugger
        }
        activeChunk = chunk
      }
    },

    /**
     * @param{Bar} source overlaping bar
     * @param{Bar} destination destination bar
     */
    mergeBarIntoBar(source, destination) {
      console.log('merge', source, 'into', destination)
      for (let exchange in source.exchanges) {
        if (!destination.exchanges[exchange]) {
          destination.exchanges[exchange] = source.exchanges[exchange]
        } else {
          destination.exchanges[exchange].open = source.exchanges[exchange].open
          destination.exchanges[exchange].high = Math.max(destination.exchanges[exchange].high, source.exchanges[exchange].high)
          destination.exchanges[exchange].low = Math.max(destination.exchanges[exchange].low, source.exchanges[exchange].low)
          destination.exchanges[exchange].vbuy += source.exchanges[exchange].vbuy
          destination.exchanges[exchange].vsell += source.exchanges[exchange].vsell
          destination.exchanges[exchange].cbuy += source.exchanges[exchange].cbuy
          destination.exchanges[exchange].csell += source.exchanges[exchange].csell
          destination.exchanges[exchange].lbuy += source.exchanges[exchange].lbuy
          destination.exchanges[exchange].lsell += source.exchanges[exchange].lsell
        }
      }

      if (source.series) {
        destination.series = source.series
      }

      if (source.sSide) {
        destination.sSide = source.sSide
      }
    },

    /**
     * @param {Bar?} referenceBar take this bar as reference (last bar) for the new chart
     */
    clearChart(referenceBar) {
      for (let serie of series) {
        console.log(`[serie.${serie.id}] /clear`)

        this.clearSerie(serie)
      }
    },
    setActiveBar(referenceBar) {
      console.log('set active bar')
      console.log(`\t current activebar timestamp: ${activeBar && new Date(activeBar.timestamp * 1000).toUTCString()}`)
      console.log(`\t referenceBar timestamp: ${referenceBar && new Date(referenceBar.timestamp * 1000).toUTCString()}`)
      if (!referenceBar) {
        console.log(`\n\t use use current time and create new activeBar (empty)`)
        const now = Math.floor(+new Date() / 1000 / this.timeframe) * this.timeframe
        activeBar = this.newBar(now, null, 'realtime')
      } else {
        if (activeBar) {
          //console.log('activebar before', JSON.stringify(activeBar))
          console.log(`\n\t use both`)
          this.mergeBarIntoBar(referenceBar, activeBar)
          //console.log('activebar after', JSON.stringify(activeBar))
        } else {
          console.log(`\n\t use referenceBar as it is`)
          activeBar = this.newBar(referenceBar.timestamp, referenceBar, 'realtime')
        }
      }
    },
    clearData() {
      cache.splice(0, cache.length)
      cacheRange.from = cacheRange.to = renderedRange.from = renderedRange.to = null
      activeChunk = null
      activeBar = null

      this.dump('chunks')
      this.dump('renderedRange')
      this.dump('cacheRange')
      this.dump('visibleRange')
    },

    /**
     * @param {Serie} serie serie to clear
     */
    clearSerie(serie) {
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

      const canRender = !activeChunk || renderedRange.to >= activeChunk.from

      for (let i = 0; i <= trades.length; i++) {
        const timestamp = trades[i] ? Math.floor(trades[i][1] / 1000 / this.timeframe) * this.timeframe : Infinity

        if (!activeBar || activeBar.timestamp < timestamp) {
          if (canRender && activeBar) {
            seriesData.push(this.formatBar(activeBar))
          }

          if (!trades[i]) {
            break
          }

          activeBar = this.newBar(timestamp, activeBar, 'realtime')
        }

        const exchange = trades[i][0]
        const side = trades[i][4] > 0 ? 'buy' : 'sell'
        const vol = trades[i][3] * trades[i][2]

        if (!activeBar.exchanges[exchange]) {
          activeBar.exchanges[exchange] = {
            close: +trades[i][2]
          }

          this.resetBar(activeBar.exchanges[exchange])
        }

        if (trades[i][5] === 1) {
          activeBar.exchanges[exchange]['l' + side] += vol
          continue
        }

        activeBar.exchanges[exchange]['c' + side]++
        activeBar.exchanges[exchange]['v' + side] += vol
        activeBar.exchanges[exchange].high = Math.max(activeBar.exchanges[exchange].high, +trades[i][2])
        activeBar.exchanges[exchange].low = Math.min(activeBar.exchanges[exchange].low, +trades[i][2])
        activeBar.exchanges[exchange].close = +trades[i][2]

        if (this.actives.indexOf(exchange) !== -1) {
          activeBar['v' + side] += vol
          activeBar['c' + side]++
        }
      }

      this.dump('activeBar')

      if (!activeChunk || renderedRange.to >= activeChunk.from) {
        for (let i = 0; i < seriesData.length; i++) {
          this.updateBar(seriesData[i])
        }

        renderedRange.to = activeBar.timestamp
      }

      this.dump('renderedRange')
    },

    /**
     * make bars from trades based on current timeframe
     * @param {Trade[]} trades trades to group
     */
    groupTradesIntoBars(trades) {
      if (!trades.length) {
        return
      }

      let bar = {}
      let exchangesCount = 0
      const activeExchanges = this.actives

      for (let i = 0; i < trades.length; i++) {
        if (!bar[trades[i][0]] && activeExchanges.indexOf(trades[i][0]) !== -1) {
          exchangesCount++
          bar[trades[i][0]] = {
            close: +trades[i][2]
          }

          this.resetBar(bar[trades[i][0]])
          console.log('reset bar', trades[i][0])
          if (exchangesCount === activeExchanges.length) {
            console.log('broke after', i, 'out of', trades.length)
            break
          }
        }
      }

      const bars = []
      let barTimestamp = null

      // loop through bars in range
      for (let j = 0; j <= trades.length; j++) {
        const timestamp = trades[j] ? Math.floor(trades[j][1] / 1000 / this.timeframe) * this.timeframe : Infinity

        if (barTimestamp < timestamp) {
          if (barTimestamp) {
            bars.push({
              timestamp: barTimestamp,
              exchanges: JSON.parse(JSON.stringify(bar))
            })

            if (!trades[j]) {
              break
            }

            for (let exchange in bar) {
              this.resetBar(bar[exchange])
            }
          }

          barTimestamp = timestamp
        }

        const exchange = trades[j][0]

        if (!bar[exchange]) {
          continue
        }

        const side = trades[j][4] > 0 ? 'buy' : 'sell'

        if (trades[j][5] === 1) {
          bar[exchange]['l' + side] += trades[j][3] * trades[j][2]
          continue
        }

        bar[exchange]['c' + side]++
        bar[exchange]['v' + side] += trades[j][3] * trades[j][2]
        bar[exchange].high = Math.max(bar[exchange].high, +trades[j][2])
        bar[exchange].low = Math.min(bar[exchange].low, +trades[j][2])
        bar[exchange].close = +trades[j][2]
      }

      const from = Math.floor(bars[0].timestamp / this.timeframe) * this.timeframe
      const to = Math.floor(bars[bars.length - 1].timestamp / this.timeframe) * this.timeframe
      const median = from + (to - from) / 2

      return { from, to, median, bars }
    },

    /**
     * @param {Bar[]} bars bars to render
     */
    renderBars(bars) {
      const seriesData = []

      let activeBar

      for (let bar of bars) {
        activeBar = this.newBar(bar.timestamp, activeBar, 'chunk')

        for (let exchange in bar.exchanges) {
          if (this.actives.indexOf(exchange) === -1 || this.exchanges[exchange].ohlc === false) {
            continue
          }

          activeBar.vbuy += bar.exchanges[exchange].vbuy
          activeBar.vsell += bar.exchanges[exchange].vsell
          activeBar.cbuy += bar.exchanges[exchange].cbuy
          activeBar.csell += bar.exchanges[exchange].csell
          activeBar.lbuy += bar.exchanges[exchange].lbuy
          activeBar.lsell += bar.exchanges[exchange].lsell

          activeBar.exchanges[exchange] = {
            ...bar.exchanges[exchange]
          }
        }

        seriesData.push(this.formatBar(activeBar))
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

      this.setActiveBar(activeBar)

      return activeBar
    },

    renderVisibleChunks() {
      const visibleRange = this.getVisibleRange()

      let bars = []

      console.log(`[chart.renderVisibleChunks] from: ${this.formatTime(visibleRange.from)} -> to: ${this.formatTime(visibleRange.to)}`)

      for (let chunk of cache) {
        if (chunk) {
          console.log('checking chunk', 'from', this.formatTime(visibleRange.from), 'to', this.formatTime(visibleRange.to))
        }
        if (
          (chunk.from >= visibleRange.from && chunk.from <= visibleRange.to) ||
          (chunk.to >= visibleRange.from && chunk.to <= visibleRange.to) ||
          (chunk.from <= visibleRange.from && chunk.to <= visibleRange.to)
        ) {
          if (chunk.from >= visibleRange.from && chunk.from <= visibleRange.to) {
            console.log('chunk from is visible')
          }
          if (chunk.to >= visibleRange.from && chunk.to <= visibleRange.to) {
            console.log('chunk to is visible')
          }
          if (chunk.from <= visibleRange.from && chunk.to <= visibleRange.to) {
            console.log('chunk larger than view')
          }
          console.log(
            `\t-> select chunk ${chunk.active ? '(active chunk)' : ''} n°${cache.indexOf(chunk)} from: ${this.formatTime(
              chunk.from
            )} -> to: ${this.formatTime(chunk.to)}`
          )
          bars = bars.concat(chunk.bars)
          chunk.rendered = true
        } else {
          chunk.rendered = false
          console.log(`\t-> ignore chunk n°${cache.indexOf(chunk)} from: ${this.formatTime(chunk.from)} -> to: ${this.formatTime(chunk.to * 1000)}`)
        }
      }

      this.dump('chunks')

      this.renderBars(bars)
    },

    /**
     * @param {Bar | ExchangeBar} bar bar to clear for next timestamp
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
    newBar(timestamp, referenceBar, type) {
      if (referenceBar) {
        referenceBar.type = type

        if (referenceBar.timestamp < timestamp) {
          if (type === 'realtime') {
            console.log('newBar (realtime)')
            if (!cache.length || !cache[cache.length - 1].active) {
              this.saveChunk({
                rendered: true,
                from: referenceBar.timestamp,
                to: referenceBar.timestamp,
                active: true,
                bars: [
                  {
                    timestamp: referenceBar.timestamp,
                    exchanges: referenceBar.exchanges
                  }
                ]
              })
              referenceBar.exchanges = JSON.parse(JSON.stringify(referenceBar.exchanges))
            } else {
              cache[cache.length - 1].bars.push({
                timestamp: referenceBar.timestamp,
                exchanges: JSON.parse(JSON.stringify(referenceBar.exchanges))
              })
              cache[cache.length - 1].to = referenceBar.timestamp
            }
          }

          referenceBar.timestamp = timestamp

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
          type,
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
          // console.log('remove marker at index', i)
          serie.markers.splice(i, 1)
          break
        }
      }

      // console.log('set marker', new Date(marker.time * 1000).toUTCString(), marker)

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
      })
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
          console.log(`[serie.${serie.id}] /replace whole serie with ${seriesData[serie.id].length} points`)
          serie.api.setData(seriesData[serie.id])
        }
      }
    },

    /**
     * update last or add new bar to chart
     * @param {Bar} bar
     */
    updateBar(bar) {
      this.preventPan()

      for (let serie of series) {
        if (bar[serie.id]) {
          // console.log(`[serie.${serie.id}] update point ${new Date(bar[serie.id].time * 1000).toUTCString()}`, bar[serie.id])
          serie.api.update(bar[serie.id])

          if (!isCrosshairActive) {
            if (bar[serie.id].open) {
              this.$set(
                this.legend,
                serie.id,
                `open: ${this.$root.formatPrice(bar[serie.id].open)}, high: ${this.$root.formatPrice(
                  bar[serie.id].high
                )}, low: ${this.$root.formatPrice(bar[serie.id].low)}, close: ${this.$root.formatPrice(bar[serie.id].close)}`
              )
            } else {
              this.$set(this.legend, serie.id, this.$root.formatAmount(bar[serie.id].value))
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
        if (bar.type === 'realtime' && this.actives.indexOf(exchange) === -1) {
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
    formatBar(bar) {
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
    startResize(event) {
      if (event.which === 3) {
        return
      }

      this.resizing = event.pageY
    },

    /**
     * on dblclick on height handler
     * @param {MouseEvent} event dbl click event
     */
    resetHeight(event) {
      delete this.resizing

      this.$store.commit('setChartHeight', null)

      this.updateChartHeight()
    },

    /**
     * refresh chart height based on container dimensions
     */
    updateChartHeight() {
      if (!chart) {
        return
      }

      const size = this.getChartSize()

      chart.resize(size.width, size.height)
    },

    /**
     * get chart height based on container dimensions
     */
    getChartSize() {
      const w = this.$refs.chartContainer.offsetWidth
      const h = document.documentElement.clientHeight

      return {
        width: w,
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
    doResize(event) {
      clearTimeout(this._resizeTimeout)

      this._resizeTimeout = setTimeout(() => {
        this.updateChartHeight()
      }, 250)
    },

    /**
     * on drag height handler
     * @param {MouseEvent} event mousemove event
     */
    doDrag(event) {
      if (!isNaN(this.resizing)) {
        this.updateChartHeight((this.chartHeight || chart.options().height) + (event.pageY - this.resizing))
      }
    },

    /**
     * on end of drag height handler
     * @param {MouseEvent} event mouseup event
     */
    stopDrag(event) {
      if (this.resizing) {
        this.$store.commit('setChartHeight', this.$refs.chartContainer.clientHeight)

        delete this.resizing
      }
    },

    /**
     * on chart pan
     */
    onPan() {
      if (!chart.timeScale().getVisibleRange()) {
        return
      }

      this.dump('visibleRange')

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
          this.panPrevented = true
          this.fetch().then(() => {
            this.panPrevented = false
          })
        } else if (
          (visibleRange.from <= renderedRange.from && cacheRange.from <= renderedRange.from) ||
          (visibleRange.to >= renderedRange.to && cacheRange.to >= renderedRange.to)
        ) {
          console.log('on pan into the limites')
          if (visibleRange.from <= renderedRange.from && cacheRange.from <= renderedRange.from) {
            console.log('cache is available before renderedRange and visibleRange start befroe renderedRange')
          }
          if (visibleRange.to >= renderedRange.to && cacheRange.to >= renderedRange.to) {
            console.log('cache is available after renderedRange and visibleRange end after renderedRange')
          }
          this.renderVisibleChunks()
        }
      }, 200)
    },

    formatTime(time) {
      const date = new Date(time * 1000)

      return date.toTimeString().split(' ')[0]
    },

    dump(name) {
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
                `chunk#${i} (${a.rendered ? 'RENDERED' : 'IGNORED'})\n\t${this.formatTime(a.from)} -> ${this.formatTime(a.to)} (${a.to - a.from})`
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

.chart__scale-handler,
.chart__height-handler {
  position: absolute;
  bottom: 0;
  z-index: 2;
}

.chart__height-handler {
  left: 0;
  right: 0;
  height: 8px;
  margin-top: -4px;
  cursor: row-resize;

  @media screen and (min-width: 768px) {
    display: none;
  }
}

.chart {
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
      right: 6em;
      text-align: right;
      direction: ltr;
    }

    &:hover {
      opacity: 1;
      background-color: rgba(0, 0, 0, 0.5);
    }
  }
}
</style>
