<template>
  <div id="chart" @mouseenter="showControls = true" @mouseleave="showControls = false">
    <div class="chart__container" ref="chartContainer"></div>

    <div
      class="chart__height-handler"
      ref="chartHeightHandler"
      @mousedown="startResize"
      @dblclick.stop.prevent="resetHeight"
    ></div>

    <div class="chart__legend" v-if="legend" v-html="legend"></div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import socket from '../../services/socket'
import { chartOptions, seriesOptions, histogramOptions } from './options'

import * as TV from 'lightweight-charts'

/** @type {TV.IChartApi} */
let chart
const series = []

export default {
  data() {
    return {
      panning: false,
      fetching: false,
      tick: null,
      barTimestamp: null,
      legend: null,

      _timeframe: null
    }
  },
  computed: {
    ...mapState([
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
    socket.$on('trades.queued', this.onTrades)

    socket.$on('clean', this.onClean)

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'setPair':
          this.chart.series[0].update({ name: mutation.payload.toUpperCase() }, false)
          break
        case 'setTimeframe':
          this.setTimeframe(mutation.payload, true, this._timeframe !== this.timeframe)
          this._timeframe = parseInt(this.timeframe)
          break
        case 'toggleSnap':
          mutation.payload && this.snapRight(true)
          break
        case 'toggleExchangesBar':
          setTimeout(() => {
            this.updateChartHeight()
          })
          break
        case 'reloadExchangeState':
        case 'toggleLiquidations':
        case 'setChartPadding':
        case 'toggleVolume':
        case 'setVolumeThreshold':
          if (+new Date() - this.$root.applicationStartTime > 1000) {
            this.redrawChart()
          }
          break
        case 'toggleCandlestick':
        case 'toggleChartGridlines':
        case 'setChartGridlinesGap':
        case 'setVolumeOpacity':
          this.createChart()
          this.setTimeframe(this.timeframe)
          break
        case 'toggleVolumeAverage':
          this.chart.series[4].update({ visible: mutation.payload })
          this.chart.series[5].update({ visible: mutation.payload })
          break
        case 'setVolumeAverageLength':
          this.chart.series[4].update({
            params: { period: +mutation.payload || 14 }
          })
          this.chart.series[5].update({
            params: { period: +mutation.payload || 14 }
          })
          break
        case 'toggleSma':
          this.chart.series[6].update({ visible: mutation.payload })
          break
        case 'setSmaLength':
          this.chart.series[6].update({
            params: { period: +mutation.payload || 14 }
          })
          break
        case 'toggleChartAutoScale':
          this.resetScale('x')
          this.resetScale('y')
          break
      }
    })

    this._timeframe = parseInt(this.timeframe)
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

    this.setTimeframe(this.timeframe, true)
  },
  beforeDestroy() {
    this.destroyChart()

    socket.$off('trades.queued', this.onTrades)

    socket.$off('clean', this.onClean)

    window.removeEventListener('resize', this._doResize)
    window.removeEventListener('mousemove', this._doDrag)
    window.removeEventListener('mouseup', this._stopDrag)

    this.onStoreMutation()
  },
  methods: {
    createChart() {
      this.destroyChart()

      const options = Object.assign({}, chartOptions, this.getChartSize())

      chart = TV.createChart(this.$refs.chartContainer, options)
      chart.subscribeCrosshairMove(this.onCrosshair)
      chart.subscribeClick(this.onClick)

      window.tvchart = chart

      this.addSerie('price', 'candlestick', {
        scaleGroup: 'price'
      })
      this.addSerie('volume_delta', 'histogram', {
        scaleGroup: 'volume'
      })
      this.addSerie('volume', 'histogram', {
        color: 'rgba(255, 255, 255, .15)',
        scaleGroup: 'volume'
      })
      this.addSerie('liquidations', 'histogram', {
        scaleGroup: 'volume',
        color: '#9c27b0'
      })
      this.addSerie('volume_sell_ema', 'line', {
        scaleGroup: 'volume_ema',
        color: '#c14047',
        lineWidth: 2,
        overlay: true,
        scaleMargins: {
          top: 0.8,
          bottom: 0
        }
      })
      this.addSerie('volume_buy_ema', 'line', {
        scaleGroup: 'volume_ema',
        color: '#c9b087',
        lineWidth: 2,
        overlay: true,
        scaleMargins: {
          top: 0.8,
          bottom: 0
        }
      })
    },
    addSerie(id, type, options = {}) {
      options = Object.assign({}, seriesOptions[type] || {}, options)

      const apiMethodName = 'add' + (type.charAt(0).toUpperCase() + type.slice(1)) + 'Series'

      const serie = {
        id,
        type,
        api: chart[apiMethodName](options)
      }

      series.push(serie)
    },
    destroyChart() {
      if (!chart) {
        return
      }

      chart.unsubscribeCrosshairMove(this.onCrosshair)
      chart.unsubscribeClick(this.onClick)
      chart.remove()

      chart = null
    },
    setTimeframe(timeframe, snap = false, clear = false) {
      clearTimeout(this._renderEndTimeout)

      console.log(`[chart.setTimeframe]`, timeframe)

      const count = ((this.chart ? this.chart.chartWidth : this.$refs.chartContainer.offsetWidth) - 20 * 0.1) / this.chartCandleWidth
      const range = timeframe * 2 * count

      socket
        .fetchRange(range, clear)
        .then(response => {
          if (response) {
            console.log(`[chart.setTimeframe] done fetching (${response.results.length} new ${response.format}s)`)
          } else {
            console.log(`[chart.setTimeframe] did not fetch anything new`)
          }
        })
        .catch(() => {})
        .then(() => {
          this.redrawChart(range)
        })
    },
    redrawChart(range) {
      console.log(`[chart.redrawChart]`, range ? '(& setting range to ' + range + ')' : '')

      if (chart) {
        this.clearChart(+new Date() - this.chartRange / 2)
      }

      const tradesCount = socket.getTradesCount()

      if (tradesCount) {
        this.tickTrades(socket.getTrades())
      }
    },
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
    onCrosshair(param) {
      if (
        param === undefined ||
        param.time === undefined ||
        param.point.x < 0 ||
        param.point.x > this.$refs.chartContainer.clientWidth ||
        param.point.y < 0 ||
        param.point.y > this.$refs.chartContainer.clientHeight
      ) {
        this.legend = null
      } else {
        let txt = new Date(param.time * 1000).toUTCString() + '<br>'

        for (let serie of series) {
          const data = param.seriesPrices.get(serie.api)

          if (!data) {
            continue
          }

          if (serie.type === 'candlestick') {
            txt += `${serie.id}<br>-> open: ${data.open}, high: ${data.high}, low: ${data.low}, close: ${data.close}<br><br>`
          } else {
            txt += `${serie.id}<br>-> ${data}<br>`
          }
        }

        txt = txt.trim()

        if (txt.length) {
          this.legend = txt
        }
      }
    },
    onTrades(trades) {
      this.tickTrades(trades)
    },
    clearChart(timestamp = Infinity) {
      const now = socket.getCurrentTimestamp()

      for (let serie of series) {
        console.log(`[serie.${serie.id}] /clear`)
        serie.api.setData([])
      }

      this.barData = null
      this.barTimestamp = null

      this.createBar(Math.floor(Math.min(timestamp, socket.getFirstTimestamp()) / this.timeframe) * this.timeframe)
    },
    tickTrades(trades) {
      const bars = []

      if (!trades || !trades.length) {
        return
      }

      // first we trim trades
      // - equal or higer than current tick
      // - only from actives exchanges (enabled, matched and visible exchange)
      trades = trades
        .filter(
          a => a[1] >= this.barTimestamp && this.actives.indexOf(a[0]) !== -1 // only process trades >= current tick time // only process trades from enabled exchanges (client side)
        )
        .sort((a, b) => a[1] - b[1])

      if (!trades.length) {
        return
      }

      // define range rounded to the current timeframe
      const from = Math.floor(trades[0][1] / this.timeframe) * this.timeframe
      const to = Math.ceil(trades[trades.length - 1][1] / this.timeframe) * this.timeframe

      // loop through bars in range
      for (let i = 0; i <= trades.length; i++) {
        const timestamp = trades[i] ? Math.floor(trades[i][1] / this.timeframe) * this.timeframe : Infinity

        if (!this.barData || this.barTimestamp < timestamp) {
          if (this.barData) {
            bars.push(this.formatBar(this.barData))
          }

          if (!trades[i]) {
            break
          }

          this.createBar(timestamp)
        }

        if (trades[i][5]) {
          switch (+trades[i][5]) {
            case 1:
              if (this.chartLiquidations) {
                this.barData.liquidations += trades[i][3] * trades[i][2]
              }
              break
          }

          continue
        }

        if (this.exchanges[trades[i][0]].ohlc !== false) {
          if (!this.barData.exchanges[trades[i][0]]) {
            this.barData.exchanges[trades[i][0]] = {
              open: +trades[i][2],
              high: +trades[i][2],
              low: +trades[i][2],
              close: +trades[i][2],
              size: 0
            }
          }

          this.barData.exchanges[trades[i][0]].count++

          this.barData.exchanges[trades[i][0]].high = Math.max(this.barData.exchanges[trades[i][0]].high, +trades[i][2])
          this.barData.exchanges[trades[i][0]].low = Math.min(this.barData.exchanges[trades[i][0]].low, +trades[i][2])
          this.barData.exchanges[trades[i][0]].close = +trades[i][2]
          this.barData.exchanges[trades[i][0]].size += +trades[i][3]

          if (this.chartVolume && (!this.chartVolumeThreshold || trades[i][3] * trades[i][2] > this.chartVolumeThreshold)) {
            this.barData['c' + (trades[i][4] > 0 ? 'buy' : 'sell')]++
            this.barData['v' + (trades[i][4] > 0 ? 'buy' : 'sell')] += trades[i][3] * trades[i][2]
          }
        }
      }

      if (!chart.timeScale().getVisibleRange()) {
        this.replaceData(bars)
      } else {
        for (let i = 0; i < bars.length; i++) {
          this.updateBar(bars[i])
        }
      }

      window.chart = this.chart
    },
    createBar(timestamp = null) {
      if (timestamp) {
        if (isFinite(timestamp)) {
          this.barTimestamp = timestamp
        } else {
          this.barTimestamp = timestamp
        }
      } else if (this.barTimestamp) {
        this.barTimestamp += this.timeframe
      } else {
        this.barTimestamp = Math.floor(socket.getCurrentTimestamp() / this.timeframe) * this.timeframe
      }

      if (this.barData) {
        // console.log(`[chart] new bar (using previous as reference)`, new Date(this.barTimestamp).toUTCString())
        this.barData.timestamp = this.barTimestamp

        for (let exchange in this.barData.exchanges) {
          this.barData.exchanges[exchange].count = 0
          this.barData.exchanges[exchange].open = this.barData.exchanges[exchange].close
          this.barData.exchanges[exchange].high = this.barData.exchanges[exchange].close
          this.barData.exchanges[exchange].low = this.barData.exchanges[exchange].close
        }

        this.barData.vbuy_emas.push(this.barData.vbuy_ema)

        if (this.barData.vbuy_emas.length >= 14) {
          this.barData.vbuy_emas.shift()
        }

        this.barData.vsell_emas.push(this.barData.vsell_ema)

        if (this.barData.vsell_emas.length >= 14) {
          this.barData.vsell_emas.shift()
        }

        this.barData.open = parseFloat(this.barData.close)
        this.barData.high = 0
        this.barData.low = 0
        this.barData.close = 0
        this.barData.vliq = 0
        this.barData.vbuy = 0
        this.barData.vsell = 0
        this.barData.cbuy = 0
        this.barData.csell = 0
      } else {
        console.log(`[chart] new bar (empty)`, new Date(this.barTimestamp).toUTCString())
        this.barData = {
          timestamp: this.barTimestamp,
          exchanges: {},
          open: null,
          high: null,
          low: null,
          close: null,
          vliq: 0,
          vbuy: 0,
          vsell: 0,
          cbuy: 0,
          csell: 0,
          vbuy_emas: [],
          vsell_emas: []
        }

        const closes = socket.getInitialPrices()

        for (let exchange in closes) {
          if (this.actives.indexOf(exchange) === -1 || !this.exchanges[exchange] || this.exchanges[exchange].ohlc === false) {
            continue
          }

          this.barData.exchanges[exchange] = {
            size: 0,
            count: 0,
            open: closes[exchange],
            high: closes[exchange],
            low: closes[exchange],
            close: closes[exchange]
          }
        }
      }
    },
    replaceData(bars, live = false, snap = false) {
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
          // console.log(`[serie.${serie.id}] /replace whole serie with ${seriesData[serie.id].length} points`)
          serie.api.setData(seriesData[serie.id])
        }
      }
    },
    updateBar(bar) {
      for (let serie of series) {
        if (bar[serie.id]) {
          // console.log(`[serie.${serie.id}] update point ${new Date(bar[serie.id].time * 1000).toUTCString()}`, bar[serie.id])
          serie.api.update(bar[serie.id])
        }
      }
    },
    getExchangesAveragedOHLC(exchanges, barData) {
      let totalWeight = 0
      let setOpen = false

      if (barData.open === null) {
        setOpen = true
        barData.open = 0
      }

      let high = 0
      let low = 0

      barData.high = 0
      barData.low = 0
      barData.close = 0

      for (let exchange in exchanges) {
        if (setOpen) {
          barData.open += exchanges[exchange].open
        }

        barData.high += exchanges[exchange].high
        barData.low += exchanges[exchange].low
        barData.close += exchanges[exchange].close

        totalWeight++
      }

      if (setOpen) {
        barData.open /= totalWeight
      }

      barData.high /= totalWeight
      barData.low /= totalWeight
      barData.close /= totalWeight

      return { time: barData.timestamp / 1000, open: barData.open, high: barData.high, low: barData.low, close: barData.close }
    },
    formatBar(barData) {
      const points = []

      points.price = this.getExchangesAveragedOHLC(barData.exchanges, barData)

      if (this.chartVolume) {
        points.volume_delta = {
          time: barData.timestamp / 1000,
          value: Math.abs(barData.vbuy - barData.vsell),
          color: barData.vbuy - barData.vsell > 0 ? seriesOptions.candlestick.upColor : seriesOptions.candlestick.downColor
        }

        points.volume = { time: barData.timestamp / 1000, value: barData.vbuy + barData.vsell }

        barData.vbuy_ema = this.getEma(barData.vbuy, barData.vbuy_emas, 14, 1)
        points.volume_buy_ema = { time: barData.timestamp / 1000, value: barData.vbuy_ema }

        barData.vsell_ema = this.getEma(barData.vsell, barData.vsell_emas)
        points.volume_sell_ema = { time: barData.timestamp / 1000, value: barData.vsell_ema }
      }

      if (this.chartLiquidations && barData.vliq) {
        points.liquidations = { time: barData.timestamp / 1000, value: barData.vliq }
      }

      console.log(`${new Date(barData.timestamp).toUTCString()};${barData.vbuy};${barData.vbuy_ema}`)

      return points
    },
    getEma(value, values = [], length = 14, yes = false) {
      const k = 2 / (length + 1)

      if (yes) {
        console.log('calculate ema from value', value, values)
      }

      if (values.length > 0) {
        yes && console.log(`do (${value} - ${values[values.length - 1]}) * ${k} + ${values[values.length - 1]}`)
        return (value - values[values.length - 1]) * k + values[values.length - 1]
      } else {
        yes && console.log(`use value as it is ${value}`)
        return value
      }
    },
    startResize(event) {
      if (event.which === 3) {
        return
      }

      this.resizing = event.pageY
    },

    resetHeight(event) {
      delete this.resizing

      this.$store.commit('setChartHeight', null)

      this.updateChartHeight()
    },

    updateChartHeight(height = null) {
      if (!chart) {
        return
      }

      const size = this.getChartSize()

      chart.resize(size.width, size.height)
    },

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

    doResize(event) {
      clearTimeout(this._resizeTimeout)

      this._resizeTimeout = setTimeout(() => {
        this.updateChartHeight()
      }, 250)
    },

    doDrag(event) {
      if (!isNaN(this.resizing)) {
        this.updateChartHeight((this.chartHeight || chart.options().height) + (event.pageY - this.resizing))
      }
    },

    stopDrag(event) {
      if (this.resizing) {
        this.$store.commit('setChartHeight', this.$refs.chartContainer.clientHeight)

        delete this.resizing
      }
    },
    onClean(min) {
      this.redrawChart()
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

.chart__legend {
  position: absolute;
  top: 0;
  z-index: 10000;
  pointer-events: none;
  font-size: 0.7em;
}
</style>
