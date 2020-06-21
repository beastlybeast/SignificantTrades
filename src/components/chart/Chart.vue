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

    <!--<grid-layout v-if="seriesLayout"
      class="chart__layout"
      :layout.sync="seriesLayout"
      :col-num="1"
      :row-height="16"
      :margin="[0, 0]"
      :auto-size="true"
      :vertical-compact="true"
      :is-draggable="true"
      :is-resizable="true"
    >
      <grid-item v-for="item in seriesLayout"
        :x="item.x"
        :y="item.y"
        :w="item.w"
        :h="item.h"
        :i="item.i"
        :style="{height: 'auto'}"
        :key="item.i">
          {{item.i}}
      </grid-item>
    </grid-layout>-->

    <div class="chart__series">
      <SerieControl v-for="(serie, index) in activeSeries" :key="index" :id="serie" :legend="legend[serie]" />

      <dropdown
        class="available-series -left"
        v-if="availableSeries.length"
        :options="availableSeries"
        placeholder="+ serie"
        @output="$store.commit('settings/TOGGLE_SERIE', { id: availableSeries[$event], value: true })"
      ></dropdown>
    </div>
    <div class="chart__controls">
      <button class="btn -small" @click="refreshChart">Refresh</button>
    </div>
  </div>
</template>

<script>
import '../../data/typedef'
import { mapState } from 'vuex'
// import VueGridLayout from 'vue-grid-layout';
import ChartController from './chartController'
import { cacheRange, saveChunk } from './chartCache'
import seriesData from '../../data/series'
import socket from '../../services/socket'

import { formatPrice, formatAmount, formatTime, getHms } from '../../utils/helpers'

import SerieControl from './SerieControl.vue'

/**
 * @type {ChartController}
 */
let chart = null

export default {
  components: {
    SerieControl
    /* GridLayout: VueGridLayout.GridLayout,
    GridItem: VueGridLayout.GridItem */
  },

  data() {
    return {
      resizing: {},
      fetching: false,
      legend: {},
      seriesLayout: null
    }
  },

  computed: {
    ...mapState('app', ['actives', 'activeSeries']),
    ...mapState('settings', [
      'debug',
      'pair',
      'timeframe',
      'exchanges',
      'chartHeight',
      'sidebarWidth',
      'chartRefreshRate',
      'showExchangesBar',
      'timezoneOffset',
      'series'
    ]),
    availableSeries: function() {
      return Object.keys(seriesData).filter(id => this.activeSeries.indexOf(id) === -1)
    }
  },

  created() {
    chart = new ChartController()

    socket.$on('trades', this.onTrades)

    this.onStoreMutation = this.$store.subscribe(mutation => {
      switch (mutation.type) {
        case 'settings/SET_TIMEZONE_OFFSET':
          chart.clearChart()
          chart.renderVisibleChunks()
          break
        case 'app/EXCHANGE_UPDATED':
          chart.renderVisibleChunks()
          break
        case 'settings/SET_PAIR':
          chart.clear()
          break
        case 'settings/SET_TIMEFRAME':
          chart.clear()
          this.fetch()
          break
        case 'settings/SET_CHART_REFRESH_RATE':
          chart.clearQueue()
          chart.setupQueue()
          break
        case 'settings/SET_SERIE_OPTION':
          chart.setSerieOption(mutation.payload)
          break
        case 'settings/SET_SERIE_TYPE':
          chart.rebuildSerie(mutation.payload.id)
          break
        case 'settings/TOGGLE_SERIE':
          chart.toggleSerie(mutation.payload)
          break
        case 'settings/SET_CHART_PRICE_MARGINS':
          chart.setPriceMargins(mutation.payload)
          break
        case 'settings/TOGGLE_EXCHANGES_BAR':
          setTimeout(this.refreshChartDimensions.bind(this))
          break
        case 'app/SET_OPTIMAL_DECIMAL':
        case 'settings/SET_DECIMAL_PRECISION':
          // eslint-disable-next-line no-case-declarations
          const priceFormat = { precision: mutation.payload, minMove: 1 / Math.pow(10, mutation.payload) }

          chart.setSerieOption({
            id: 'price',
            key: 'priceFormat.precision',
            value: priceFormat.precision
          })

          chart.setSerieOption({
            id: 'price',
            key: 'priceFormat.minMove',
            value: priceFormat.minMove
          })

          if (!this.$store.state.settings.series['price']) {
            this.$store.state.settings.series['price'] = {}
          }

          this.$store.state.settings.series['price'].priceFormat = priceFormat

          break
      }
    })
  },

  mounted() {
    console.log(`[chart.mounted]`)

    chart.createChart(this.$refs.chartContainer, this.getChartDimensions())
    chart.setupQueue()
    this.keepAlive()

    this.refreshSeriesLayout()

    this.bindChartEvents()
    this.bindBrowserResize()

    this.fetch()
  },

  beforeDestroy() {
    this.unbindChartEvents()
    this.unbindBrowserResize()

    this.onStoreMutation()

    chart.destroy()

    clearTimeout(this._keepAliveTimeout)

    socket.$off('trades', this.onTrades)
  },

  methods: {
    refreshSeriesLayout() {
      const layout = []

      for (let serie of chart.activeSeries) {
        layout.push({
          x: 0,
          y: layout.length,
          w: 1,
          h: 1,
          i: serie.id
        })
      }

      this.seriesLayout = layout
    },

    /**
     * fetch whatever is missing based on visiblerange
     * @param {boolean} clear will clear the chart / initial fetch
     */
    fetch() {
      if (!socket.canFetch()) {
        return Promise.reject('Fetch is disabled')
      }

      const visibleRange = chart.getVisibleRange()
      const isChartEmpty = chart.isEmpty()
      let rangeToFetch

      if (isChartEmpty) {
        console.log(`[chart] fetch (real time range)`)

        rangeToFetch = chart.getRealtimeRange()
      } else if (visibleRange.from === cacheRange.from) {
        console.log(`[chart] fetch (chunk on the left)`)

        rangeToFetch = {
          from: visibleRange.from - chart.getOptimalRangeLength(),
          to: visibleRange.from
        }
      }

      /* else if (false && visibleRange.to === cacheRange.to) {
        console.log(`[chart] fetch (chunk on the right)`)

        rangeToFetch = {
          from: visibleRange.to,
          to: visibleRange.to + chart.getOptimalRangeLength()
        }
      }*/

      if (!rangeToFetch) {
        return Promise.reject('Nothing to fetch')
      }

      chart.lockRender()

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
              chunk = chart.groupTradesIntoBars(data)
              break
          }

          if (chunk) {
            saveChunk(chunk)
          }

          console.log(`[fetch] success (${data.length} new ${format}s)`)

          chart.renderVisibleChunks()
        })
        .catch(err => {
          console.error(err)
        })
        .then(() => {
          chart.unlockRender()
        })
    },

    /* onClick(param) {
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
    }, */

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
        this.legend = {}
      } else {
        for (let serie of chart.activeSeries) {
          const data = param.seriesPrices.get(serie.api)

          if (!data) {
            this.$set(this.legend, serie.id, 'n/a')
            continue
          }

          if (data.close) {
            this.$set(
              this.legend,
              serie.id,
              `O: ${formatPrice(data.open)} H: ${formatPrice(data.high)} L: ${formatPrice(data.low)} C: ${formatPrice(data.close)}`
            )
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
      if (chart.preventRender || this.chartRefreshRate) {
        chart.queueTrades(trades)
        return
      }

      chart.renderRealtimeTrades(trades)
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

      console.info(`[chart] lock pan until further notice`)
      chart.panPrevented = true
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
          referenceWidth = chart.chartInstance.options().width
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
    stopManualResize() {
      if (this.resizing.width) {
        this.$store.commit('settings/SET_SIDEBAR_WIDTH', window.innerWidth - this.$refs.chartContainer.clientWidth)

        delete this.resizing.width
      } else if (this.resizing.height) {
        this.$store.commit('settings/SET_CHART_HEIGHT', this.$refs.chartContainer.clientHeight)

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

      console.info(`[chart] unlock pan`)
      chart.panPrevented = false
    },

    /**
     * on dblclick on height handler
     * @param {MouseEvent} event dbl click event
     */
    resetHeight() {
      delete this.resizing.height

      this.$store.commit('settings/SET_CHART_HEIGHT', null)

      this.refreshChartDimensions()
    },

    /**
     * on dblclick on width handler
     * @param {MouseEvent} event dbl click event
     */
    resetWidth() {
      delete this.resizing.width

      this.$store.commit('settings/SET_SIDEBAR_WIDTH', null)

      this.refreshChartDimensions()
    },

    /**
     * refresh chart dimensions based on container dimensions
     */
    refreshChartDimensions(width, height) {
      const dimensions = this.getChartDimensions()

      chart.chartInstance.resize(width || dimensions.width, height || dimensions.height)

      this.$el.parentElement.style.width = (width || dimensions.width) + 'px'
    },

    /**
     * get chart height based on container dimensions
     */
    getChartDimensions() {
      const w = document.documentElement.clientWidth
      const h = document.documentElement.clientHeight

      return {
        width: window.innerWidth < 768 ? window.innerWidth : this.sidebarWidth > 0 ? window.innerWidth - this.sidebarWidth : w - 320,
        height:
          window.innerWidth >= 768
            ? this.$el.parentElement.clientHeight - (this.showExchangesBar ? 24 : 0)
            : this.chartHeight > 0
            ? this.chartHeight
            : +Math.min(w / 2, Math.max(300, h / 3)).toFixed()
      }
    },

    /**
     * on browser resize
     * @param {Event} event resize event
     */
    doWindowResize() {
      clearTimeout(this._resizeTimeout)

      this._resizeTimeout = setTimeout(() => {
        this.refreshChartDimensions()
      }, 250)
    },

    /**
     * on chart pan
     */
    onPan() {
      if (chart.panPrevented) {
        return
      }

      if (this._onPanTimeout) {
        clearTimeout(this._onPanTimeout)
        this._onPanTimeout = null
      }

      this._onPanTimeout = setTimeout(() => {
        if (cacheRange.from === null) {
          return
        }

        if (this._keepAliveTimeout) {
          clearTimeout(this._keepAliveTimeout)
          delete this._keepAliveTimeout
        }

        this.keepAlive()

        const visibleRange = chart.getVisibleRange()

        console.log(
          '[pan] current scrollPosition',
          getHms(chart.chartInstance.timeScale().scrollPosition() * 1000),
          '(from:',
          formatTime(visibleRange.from),
          ' to:',
          formatTime(visibleRange.to),
          ')'
        )

        if (visibleRange.from <= cacheRange.from) {
          this.panPrevented = true
          this.fetch().then(() => {
            this.panPrevented = false
          })
        } else if (
          (visibleRange.from <= chart.renderedRange.from && cacheRange.from <= chart.renderedRange.from) ||
          (visibleRange.to > chart.renderedRange.to && cacheRange.to > chart.renderedRange.to)
        ) {
          chart.renderVisibleChunks()
        }
      }, 1000)
    },

    bindChartEvents() {
      // chart.chartInstance.subscribeClick(this.onClick)
      chart.chartInstance.subscribeCrosshairMove(this.onCrosshair)
      chart.chartInstance.subscribeVisibleTimeRangeChange(this.onPan)
    },

    unbindChartEvents() {
      // chart.chartInstance.unsubscribeClick(this.onClick)
      chart.chartInstance.unsubscribeCrosshairMove(this.onCrosshair)
      chart.chartInstance.unsubscribeVisibleTimeRangeChange(this.onPan)
    },

    bindBrowserResize() {
      this._doWindowResize = this.doWindowResize.bind(this)
      window.addEventListener('resize', this._doWindowResize, false)
    },

    unbindBrowserResize() {
      window.removeEventListener('resize', this._doWindowResize)
    },

    keepAlive() {
      if (this._keepAliveTimeout) {
        chart.redraw(true)
      } else {
        console.log(`[chart] setup keepalive`)
      }

      this._keepAliveTimeout = setTimeout(this.keepAlive.bind(this), 1000 * 60 * 15)
    },

    refreshChart() {
      chart.redraw()
    }
  }
}
</script>

<style lang="scss">
#chart {
  position: relative;

  &:hover .chart__series,
  &:hover .chart__controls {
    opacity: 1;
  }
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

.chart__series {
  position: absolute;
  top: 1em;
  left: 1em;
  font-family: Roboto Condensed;
  z-index: 2;
  opacity: 0.1;
  transition: opacity 0.2s $easeOutExpo;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.chart__layout {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 3;
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

.chart__controls {
  position: absolute;
  top: 1em;
  right: 5em;
  font-family: Roboto Condensed;
  z-index: 2;
  opacity: 0.1;
  transition: opacity 0.2s $easeOutExpo;
  display: flex;
  flex-direction: row;
  align-items: flex-start;

  @media screen and (max-width: 767px) {
    display: none;
  }
}

.available-series {
  margin-top: 0.5em;
}
</style>
