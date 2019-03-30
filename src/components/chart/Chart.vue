<template>
	<div id="chart">
		<div class="chart__container" ref="chartContainer" v-bind:class="{fetching: fetching}" v-bind:style="{ height: chartHeight }" @mouseenter="showControls = true" @mouseleave="showControls = false">
      <div class="chart__notice" v-if="isDirty" v-tippy="{ placement: 'bottom' }" :title="`${pendingExchanges.join(pendingExchanges.length === 2 ? ' and ' : ', ')} did not send any trades since the beginning of the session.<br>Chart will be updated automaticaly once the data is received`">
        <i class="icon-warning"></i> {{ pendingExchanges.length }} exchange{{ pendingExchanges.length > 1 ? 's are' : ' is' }} still silent
      </div>
      
      <div class="chart__controls chart-controls" v-if="showControls">
        <div class="chart-controls__left">
        </div>
        <div class="chart-controls__right">
          <div class="chart__scale-mode" v-on:click="$store.commit('toggleChartAutoScale', !chartAutoScale)" v-tippy v-bind:title="chartAutoScale ? 'Unlock price axis' : 'Lock price axis'">
            <span class="min-768">{{ chartAutoScale ? "AUTO" : "FREE" }}</span> <i v-bind:class="{ 'icon-locked': chartAutoScale, 'icon-unlocked': !chartAutoScale }"></i>
          </div>
        </div>
      </div>

      <div class="chart__scale-handler -y" ref="chartScaleHandler" v-on:mousedown="startScale('y', $event)" v-on:dblclick.stop.prevent="resetScale('y')"></div>
      <div class="chart__scale-handler -x" ref="chartScaleHandler" v-on:mousedown="startScale('x', $event)" v-on:dblclick.stop.prevent="resetScale('x')"></div>
      <div class="chart__height-handler" ref="chartHeightHandler" v-on:mousedown="startResize" v-on:dblclick.stop.prevent="resetHeight"></div>

      <div class="chart__canvas"></div>
		</div>
	</div>
</template>

<script>
import { mapState } from 'vuex';

import socket from "../../services/socket";
import chartOptions from "./options.json";

import Highcharts from 'highcharts/highstock';
import Indicators from 'highcharts/indicators/indicators';
import EMA from 'highcharts/indicators/ema';
// import BB from 'highcharts/indicators/bollinger-bands';

import enablePanning from './pan.js';

Indicators(Highcharts);
EMA(Highcharts);
// BB(Highcharts); // is bugged on highchart 7 :-(

export default {
  data() {
    return {
      panning: false,
      fetching: false,
      showControls: false,
			chart: null,
      tick: null,
      cursor: null,
      queuedTrades: [],
      queuedTicks: [],
      pendingExchanges: [],
      isDirty: false,
      isMini: false,

      _timeframe: null
    };
  },
  computed: {
    ...mapState([
      'timeframe',
      'actives',
      'exchanges',
      'isSnaped',
      'isReplaying',
      'chartAutoScale',
      'chartHeight',
      'chartRange',
      'chartCandleWidth',
      'chartLiquidations',
      'chartCandlestick',
      'chartPadding',
      'chartGridlines',
      'chartGridlinesGap',
      'chartVolume',
      'chartVolumeOpacity',
      'chartVolumeThreshold'
		])
  },
  created() {
    socket.$on('trades.queued', this.onTrades);

    socket.$on('clean', this.onClean);

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'setTimeframe':
          this.setTimeframe(mutation.payload, true, this._timeframe !== this.timeframe);
          this._timeframe = parseInt(this.timeframe);
          break;
        case 'toggleSnap':
          mutation.payload && this.snapRight(true);
          break;
        case 'setExchangeMatch':
          this.updateChartHeight();
          break;
        case 'reloadExchangeState':
        case 'toggleLiquidations':
        case 'setChartPadding':
        case 'toggleVolume':
        case 'setVolumeThreshold':
          if (+new Date() - this.$root.applicationStartTime > 5000) {
            this.redrawChart()
          }
          break;
        case 'toggleCandlestick':
        case 'toggleChartGridlines':
        case 'setChartGridlinesGap':
        case 'setVolumeOpacity':
          this.createChart();
          this.setTimeframe(this.timeframe);
        break;
        case 'toggleVolumeAverage':
          this.chart.series[4].update({visible: mutation.payload});
          this.chart.series[5].update({visible: mutation.payload});
        break;
        case 'setVolumeAverageLength':
          this.chart.series[4].update({params: {period: +mutation.payload || 14}});
          this.chart.series[5].update({params: {period: +mutation.payload || 14}});
        break;
        case 'toggleReplaying':
          if (mutation.payload) {
            this.clearChart(mutation.payload.timestamp);
            this.setRange(+new Date() - mutation.payload.timestamp);
          } else {
            this.setTimeframe(this.timeframe);
          }
        break;
        case 'toggleChartAutoScale':
          this.resetScale('x');
          this.resetScale('y');
        break;
      }
    });

    this._timeframe = parseInt(this.timeframe);
    this._scaling = {};
  },
	mounted() {
    console.log(`[chart.mounted]`);

    this.$refs.chartContainer.style.height = this.getChartSize().height + 'px';

    window.setTimeout(() => this.createChart());

    this._doResize = this.doResize.bind(this);

    window.addEventListener('resize', this._doResize, false);

    this._doDrag = this.doDrag.bind(this);

    window.addEventListener('mousemove', this._doDrag, false);

    this._stopDrag = this.stopDrag.bind(this);

    window.addEventListener('mouseup', this._stopDrag, false);

    this.setTimeframe(this.timeframe, true);
	},
  beforeDestroy() {
    this.destroyChart();

    socket.$off('trades.queued', this.onTrades);

    socket.$off('clean', this.onClean);

    window.removeEventListener('resize', this._doResize);
    window.removeEventListener('mousemove', this._doDrag);
    window.removeEventListener('mouseup', this._stopDrag);

    // this.$el.removeEventListener('wheel', this.doZoom);

    this.onStoreMutation();
  },
  methods: {
    createChart() {
      this.destroyChart();

      this.theme = JSON.parse(JSON.stringify(chartOptions)).theme;

      const options = this.getChartOptions();

      this.chart = Highcharts.stockChart(this.$el.querySelector('.chart__canvas'), options);

      enablePanning(Highcharts, this.chart);

      this.updateChartHeight();

      this.isMini = false;
      this.updateMiniMode();

      if (this.queuedTicks.length) {
        this.tickHistoricals(this.queuedTicks.splice(0, this.queuedTicks.length));

        this.chart.redraw();
      }

      if (this.queuedTrades.length) {
        this.tickTrades(this.queuedTrades.splice(0, this.queuedTrades.length));

        this.chart.redraw();
      }

      this.$refs.chartContainer.style.height = '';
    },
    destroyChart() {
      if (!this.chart) {
        return;
      }

      this.chart.destroy();
      delete this.chart;
    },
    setTimeframe(timeframe, snap = false, clear = false, print = true) {
      clearTimeout(this._renderEndTimeout);

      console.log(`[chart.setTimeframe]`, timeframe);

      const count = ((this.chart ? this.chart.chartWidth : this.$refs.chartContainer.offsetWidth) - 20 * .1) / this.chartCandleWidth;
      const range = timeframe * 2 * count;

      socket.fetchRangeIfNeeded(range, clear).then(response => {
        if (response) {
          console.log(`[chart.setTimeframe] done fetching (${response.results.length} new ${response.format}s)`)
        } else {
          console.log(`[chart.setTimeframe] did not fetch anything new`);
        }

        this.redrawChart(range);
      })
    },
    redrawChart(range) {
      console.log(`[chart.redrawChart]`, range ? '(& setting range to ' + range + ')' : '');

      if (range) {
        this.setRange(range / 2);
      }

      if (this.chart) {
        this.clearChart(+new Date() - this.chartRange / 2);
      }

      if (!print || !socket.ticks.length && !socket.trades.length) {
        return;
      }

      this.tickHistoricals(socket.ticks);

      this.tickTrades(socket.trades);
    },
    onTrades(trades) {
      this.tickTrades(trades, true);
    },
    tickHistoricals(ticks) {
      if (!this.chart) {
        this.queuedTicks = this.queuedTicks.concat(ticks);

        return;
      } else if (this.queuedTicks.length) {
        ticks = ticks.concat(this.queuedTicks.splice(0, this.queuedTicks.length));
      }

      ticks = ticks.filter(tick =>
        this.actives.indexOf(tick.exchange) !== -1
        && this.exchanges[tick.exchange] && this.exchanges[tick.exchange].ohlc !== false
      );

      if (!ticks.length) {
        return;
      }

      this.createTick(ticks[0].timestamp)

      const formatedTicks = [];

      ticks.forEach((tick, index) => {
        if (this.chartVolume) {
          this.tickData.buys += tick.buys;
          this.tickData.sells += tick.sells;
        }

        if (this.chartLiquidations) {
          this.tickData.liquidations += tick.liquidations || 0;
        }

        this.tickData.exchanges[tick.exchange] = {
          open: tick.open,
          high: tick.high,
          low: tick.low,
          close: tick.close,
        }

        if (!ticks[index + 1] || this.tickData.timestamp !== ticks[index + 1].timestamp) {
          const formatedTick = this.formatTickData(this.tickData);
          this.addTickToSeries(formatedTick);

          formatedTicks.push(formatedTick);

          if (ticks[index + 1]) {
            this.createTick(ticks[index + 1].timestamp);
          }
        }
      });

      this.tickData.added = true;

      this.chart.redraw();

      this.updateChartedCount();
    },
    clearChart(timestamp = Infinity) {
      const now = socket.getTime();

      for (let serie of this.chart.series) {
        serie.setData([], false);
      }

      this.tickData = null;
      this.cursor = null;

      this.createTick(Math.floor(
        (Math.min(timestamp, socket.ticks[0] ? socket.ticks[0].timestamp : Infinity, socket.trades[0] ? socket.trades[0][1] : Infinity)  / this.timeframe)
      ) * this.timeframe);

      this.chart.redraw();
    },
    tickTrades(trades, live = false) {
      const ticks = [];

      if (!trades || !trades.length) {
        trades = [];
      }

      // chart doesn't allow edit on invisible ticks when it is panned
      // we just process them when will get there
      if (this.panning || this.isPanned()) {
        this.queuedTrades = this.queuedTrades.concat(trades);

        return;

      } else if (this.queuedTrades.length) {

        // right here
        trades = this.queuedTrades.splice(0, this.queuedTrades.length).concat(trades);

      }
      
      // first we trim trades
      // - equal or higer than current tick
      // - only from actives exchanges (enabled, matched and visible exchange)
      trades = trades
        .filter(a =>
            a[1] >= this.cursor // only process trades >= current tick time
            && this.actives.indexOf(a[0]) !== -1 // only process trades from enabled exchanges (client side)
        )
        .sort((a, b) => a[1] - b[1]);

      if (!trades.length) {
        return;
      }

      // define range rounded to the current timeframe
      const from = Math.floor(trades[0][1] / this.timeframe) * this.timeframe;
      const to = Math.ceil(trades[trades.length - 1][1] / this.timeframe) * this.timeframe;

      // loop through ticks in range
      for (let t = from; t < to; t += this.timeframe) {
        let i;

        if (!this.tickData || this.cursor < t) {
          this.createTick(t);
        }

        for (i = 0; i < trades.length; i++) {
          if (trades[i][1] >= t + this.timeframe) {
            break;
          }

          if (trades[i][5]) {
            switch (+trades[i][5]) {
              case 1:
                if (this.chartLiquidations) {
                  this.tickData.liquidations += trades[i][3] * trades[i][2];
                }
                break;
            }

            continue;
          }

          if (this.exchanges[trades[i][0]].ohlc !== false) {
            if (!this.tickData.exchanges[trades[i][0]]) {
              this.tickData.exchanges[trades[i][0]] = {
                open: +trades[i][2],
                high: +trades[i][2],
                low: +trades[i][2],
                close: +trades[i][2],
                size: 0
              };
            }

            this.tickData.exchanges[trades[i][0]].count++;

            this.tickData.exchanges[trades[i][0]].high = Math.max(this.tickData.exchanges[trades[i][0]].high, +trades[i][2]);
            this.tickData.exchanges[trades[i][0]].low = Math.min(this.tickData.exchanges[trades[i][0]].low, +trades[i][2]);
            this.tickData.exchanges[trades[i][0]].close = +trades[i][2];
            this.tickData.exchanges[trades[i][0]].size += +trades[i][3];

            if (this.chartVolume && (!this.chartVolumeThreshold || trades[i][3] * trades[i][2] > this.chartVolumeThreshold)) {
              this.tickData[(trades[i][4] > 0 ? 'buys' : 'sells') + 'Count']++;
              this.tickData[trades[i][4] > 0 ? 'buys' : 'sells'] += trades[i][3] * trades[i][2];
            }
          }
        }

        if (i) {
          trades.splice(0, i);
        }

        ticks.push(this.formatTickData(this.tickData));
      }

      if (ticks.length && ticks[0].added) {
        this.updateCurrentTick(ticks[0], live);

        ticks.splice(0, 1);
      }

      for (let i = 0; i < ticks.length; i++) {
        this.addTickToSeries(ticks[i], live, i === ticks.length - 1);
      }
      
      if (ticks.length) {
        this.chart.redraw();
      }

      this.tickData.added = true;

      window.chart = this.chart;
    },
    getCurrentTickPoints() {
      return {
        ohlc: this.chart.series[0].points[this.chart.series[0].points.length - 1],
        buys: this.chart.series[1].points[this.chart.series[1].points.length - 1],
        sells: this.chart.series[2].points[this.chart.series[2].points.length - 1],
        liquidations: this.chart.series[3].points[this.chart.series[3].points.length - 1],
      };
    },
    createTick(timestamp = null) {
      if (timestamp) {
        if (isFinite(timestamp)) {
          this.cursor = timestamp;
        } else {
          this.cursor = timestamp;
        }
      } else if (this.cursor) {
        this.cursor += this.timeframe;
      } else {
        this.cursor = Math.floor(socket.getTime() / this.timeframe) * this.timeframe;
      }

      if (this.tickData) {
        this.tickData.timestamp = this.cursor;

        for (let exchange in this.tickData.exchanges) {
          this.tickData.exchanges[exchange].count = 0;
          this.tickData.exchanges[exchange].open = this.tickData.exchanges[exchange].close;
          this.tickData.exchanges[exchange].high = this.tickData.exchanges[exchange].close;
          this.tickData.exchanges[exchange].low = this.tickData.exchanges[exchange].close;
        }

        this.tickData.open = parseFloat(this.tickData.close);
        this.tickData.high = null;
        this.tickData.low = null;
        this.tickData.close = 0;
        this.tickData.liquidations = 0;
        this.tickData.buys = 0;
        this.tickData.sells = 0;
        this.tickData.buysCount = 0;
        this.tickData.sellsCount = 0;
        this.tickData.added = false;
      } else {
        this.tickData = {
          timestamp: this.cursor,
          exchanges: {},
          open: null,
          high: null,
          low: null,
          close: null,
          liquidations: 0,
          buys: 0,
          sells: 0,
          buysCount: 0,
          sellsCount: 0,
          added: false,
        }

        const closes = socket.getFirstCloses();

        for (let exchange in closes) {
          if (this.actives.indexOf(exchange) === -1 || !this.exchanges[exchange] || this.exchanges[exchange].ohlc === false) {
            continue;
          }

          this.tickData.exchanges[exchange] = {
            size: 0,
            count: 0,
            open: closes[exchange],
            high: closes[exchange],
            low: closes[exchange],
            close: closes[exchange]
          }
        }
      }

      this.updateChartedCount();
    },
    addTickToSeries(tick, live = false, snap = false) {
      this.chart.series[0].addPoint(tick.ohlc, false);

      if (this.chartVolume) {
        this.chart.series[1].addPoint(tick.buys, false);
        this.chart.series[2].addPoint(tick.sells, false);
      }

      if (this.chartLiquidations) {
        this.chart.series[3].addPoint(tick.liquidations, false);
      }

      if (snap && this.isSnaped) {
        this.snapRight(live);
      }
    },
    updateCurrentTick(tick, live = false) {
      const tickPoints = this.getCurrentTickPoints();

      if (this.chartLiquidations) {
        tickPoints.liquidations.update(tick.liquidations[1], false);
      }

      if (this.chartVolume) {
        tickPoints.buys.update(tick.buys[1], false);
        tickPoints.sells.update(tick.sells[1], false);
      }

      tickPoints.ohlc.update(tick.ohlc);
    },
    formatTickData(tickData) {
      return {
        buys: [tickData.timestamp, tickData.buys],
        sells: [tickData.timestamp, tickData.sells],
        liquidations: [tickData.timestamp, tickData.liquidations],
        ohlc: this.getExchangesAveragedOHLC(tickData.exchanges, tickData),
        added: tickData.added
      }
    },
    getExchangesAveragedOHLC(exchanges, tickData) {
      let totalWeight = 0;
      let setOpen = false;

      if (tickData.open === null) {
        setOpen = true;
        tickData.open = 0;
      }

      let high = 0;
      let low = 0;

      tickData.close = 0;

      for (let exchange in exchanges) {
        let exchangeWeight = 1;

        if (setOpen) {
          tickData.open += exchanges[exchange].open * exchangeWeight;
        }

        high += exchanges[exchange].high * exchangeWeight;
        low += exchanges[exchange].low * exchangeWeight;
        tickData.close += ((exchanges[exchange].close + exchanges[exchange].high + exchanges[exchange].low) / 3) * exchangeWeight;

        totalWeight += exchangeWeight;
      }

      if (setOpen) {
        tickData.open /= totalWeight;
      }

      high /= totalWeight;
      low /= totalWeight;
      tickData.close /= totalWeight;

      tickData.high = Math.max(tickData.high === null ? 0 : tickData.high, setOpen ? 0 : tickData.open, high);
      tickData.low = Math.min(tickData.low === null ? Infinity : tickData.low, setOpen ? Infinity : tickData.open, low);

      return [
        tickData.timestamp,
        tickData.open,
        tickData.high,
        tickData.low,
        tickData.close
      ];
    },
    startResize(event) {
      if (event.which === 3) {
        return;
      }

      this.resizing = event.pageY;
    },

    resetHeight(event) {
      delete this.resizing;

      this.$store.commit('setChartHeight', null);

      this.updateChartHeight();
    },

    startScale(axis, event) {
      if (event.which === 3) {
        return;
      }

      this._scaling[axis] = event['page' + axis.toUpperCase()];
    },

    updateChartHeight(height = null) {
      const size = this.getChartSize();

      if (window.innerWidth >= 768) {
        height = this.$el.clientHeight;
      }

      this.chart.setSize(
        size.width,
        height || size.height,
        false
      );
    },

    updateMiniMode() {
      const isMini = window.innerWidth < 380;

      if (this.isMini !== isMini) {
        this.chart.yAxis[1].update({
          top: isMini ? '40%' : '75%',
          height: isMini ? '60%' : '25%'
        }, false)

        this.chart.yAxis[2].update({
          top: isMini ? '40%' : '75%',
          height: isMini ? '60%' : '25%'
        }, false);

        setTimeout(this.chart.redraw.bind(this.chart), 1000);
      }

      this.isMini = isMini;
    },

    resetScale(axis) {
      delete this._scaling[axis];

      this.updateChartScale(axis, null);
    },

    updateChartScale(axis, scale) {
      let min = this.chart[axis + 'Axis'][0].min;
      let max = this.chart[axis + 'Axis'][0].max;

      let range;

      if (scale === null) {
        min = max = null;
      } else if (scale) {
        range = (max - min) * (scale * (axis === 'x' ? -1 : 1));

        min -= range;
        max += range;
      }

      this.chart[axis + 'Axis'][0].setExtremes(min, max);

      if (axis === 'x') {
        range = this.chart.xAxis[0].max - this.chart.xAxis[0].min;

        this.$store.commit('setChartRange', range);
        this.$store.commit('setChartCandleWidth', this.chart.chartWidth / (range / this.timeframe));
      }
    },

    getChartSize() {
      const w = this.$refs.chartContainer.offsetWidth;
      const h = document.documentElement.clientHeight;

      return {
        width: w,
        height: this.chartHeight > 0 ? this.chartHeight : +Math.min(w / 2, Math.max(300, h / 3)).toFixed()
      };
    },

    doResize(event) {
      clearTimeout(this._resizeTimeout);

      this._resizeTimeout = setTimeout(() => {
        this.updateMiniMode();
        this.updateChartHeight();
      }, 250);
    },

    doDrag(event) {
      if (!isNaN(this.resizing)) {
        this.updateChartHeight(this.chart.chartHeight + (event.pageY - this.resizing));

        this.resizing = event.pageY;
      } else if (typeof this._scaling['x'] !== 'undefined' && !isNaN(this._scaling['x'])) {
        this.updateChartScale('x', (event.pageX - this._scaling['x']) / 100, true);

        this._scaling['x'] = event.pageX;
      } else if (typeof this._scaling['y'] !== 'undefined' && !isNaN(this._scaling['y'])) {
        this.updateChartScale('y', (event.pageY - this._scaling['y']) / 100, true);

        this._scaling['y'] = event.pageY;
      }
    },

    stopDrag(event) {
      if (this.resizing) {
        this.$store.commit('setChartHeight', this.chart.chartHeight);

        delete this.resizing;
      }

      for (let axis in this._scaling) {
        delete this._scaling[axis];
      }
    },

    snapRight(redraw = false) {
      if (this.panning) {
        return;
      }

      if (Object.keys(this._scaling).length) {
        return;
      }

      const margin = this.chartRange * this.chartPadding;
      const now = socket.getTime();

      let from;
      let to;

      if (this.isReplaying) {
        from = this.chart.xAxis[0].dataMin;
      } else {
        from = now - this.chartRange + margin;
      }

      to = now + margin;

      if (to < this.chart.xAxis[0].max) {
        return;
      }

      from = Math.ceil(from / this.timeframe) * this.timeframe;
      to = Math.ceil(to / this.timeframe) * this.timeframe;

      this.chart.xAxis[0].setExtremes(from, to, redraw);
    },
    
    updateChartedCount() {
      let pendingExchanges = this.actives.filter(id => this.exchanges[id].ohlc !== false);

      if (this.tickData) {
        pendingExchanges = pendingExchanges.filter(id => Object.keys(this.tickData.exchanges).indexOf(id) === -1);
      }
      
      if (this.pendingExchanges.length !== pendingExchanges.length) {
        this.redrawChart();
      }

      this.pendingExchanges = pendingExchanges.map(a => a.toUpperCase());

      this.isDirty = !this.isReplaying && this.pendingExchanges.length;

      return this.isDirty;
    },

    isPanned() {
      if (!this.chart || !this.chart.series.length) {
        return true;
      }

      return this.tickData && this.chart.series[0].points.length && this.chart.series[0].points[this.chart.series[0].points.length - 1].x < this.tickData.timestamp
    },

    setRange(range) {
      this.$store.commit('setChartRange', range);

      if (this.chart) {
        const padding = this.chartRange * this.chartPadding;
        const now = socket.getTime();
        let from = now - this.chartRange;
        let to = now;

        if (!this.isReplaying) {
          from += padding;
          to += padding;
        }

        this.chart.xAxis[0].setExtremes(from, to, true);
      }
    },
    getChartOptions() {
      const options = JSON.parse(JSON.stringify(chartOptions));

      // time axis
      options.xAxis.labels.color = this.theme.labels;
      options.xAxis.crosshair.color = this.theme.crosshair;

      // price axis
      if (this.chartGridlines) {
        options.yAxis[0].labels.color = this.theme.labels;
        options.yAxis[0].gridLineColor = this.theme.gridline;
        options.yAxis[0].crosshair.color = this.theme.crosshair;
        options.yAxis[0].tickPixelInterval = this.chartGridlinesGap || null;
      } else {
        options.yAxis[0].visible = false;
      }

      // candlesticks
      options.series[0].upColor = this.theme.up;
      options.series[0].upLineColor = this.theme.up;
      options.series[0].color = this.theme.down;
      options.series[0].lineColor = this.theme.down;

      // line
      options.series[0].type = this.chartCandlestick ? 'candlestick' : 'spline';
      options.series[0].lineColor = this.chartCandlestick ? options.series[0].down : 'white';
      options.series[0].lineWidth = this.chartCandlestick ? 1 : 2;

      // buys
      options.series[1].color = this.theme.buys;

      // sells
      options.series[2].color = this.theme.sells;

      // liquidations bars
      options.series[3].color = this.theme.liquidations;

      // sells EMA
      options.series[4].lineColor = this.theme.sellsMA;

      // buys EMA
      options.series[5].lineColor = this.theme.buysMA;

      // price MA
      options.series[6].lineColor = this.theme.priceMA;
      options.series[7] && (options.series[7].lineColor = this.theme.priceMA);

      options.chart.events = {
        _panStart: () => (this.panning = true),
        _panEnd: () => (this.panning = false),
        _pan: () => {
          const isPanned = this.chart.xAxis[0].max < this.chart.xAxis[0].dataMax;

          if (!isPanned !== this.isSnaped) {
            this.$store.commit('toggleSnap', !isPanned);
          }
        },
        load: () => {
          setTimeout(this.applyChartStyles.bind(this), 200);
        }
      }

      return options;
    },
    applyChartStyles() {
      if (this.chartVolumeOpacity < 1) {
        this.chart.series[1].group.element.style.opacity = this.chartVolumeOpacity;
        this.chart.series[2].group.element.style.opacity = this.chartVolumeOpacity;
      }
    },
    onClean(min) {
      this.redrawChart();
    }
  }
};
</script>

<style lang='scss'>
@import '../../assets/sass/variables';

.chart__range {
  display: flex;
  justify-content: space-between;
  position: absolute;
  width: 100%;
  height: 0px;
  font-size: 14px;
  opacity: 0.4;
  font-family: monospace;
  font-weight: 300;
  letter-spacing: -0.5px;

  > div {
    padding: 10px;
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
  
  .highcharts-container {
    width: 100% !important;
  }

  .chart__selection {
    position: absolute;
    top: 0;
    bottom: 0;
    background-color: rgba(white, 0.1);
    z-index: 1;
    pointer-events: none;
  }

  &.fetching {
    opacity: 0.5;
  }

  .highcharts-credits {
    visibility: hidden;
  }
}

.chart__scale-handler,
.chart__height-handler {
  position: absolute;
  bottom: 0;
  z-index: 2;
}

.chart__scale-handler {
  &.-y {
    right: 0;
    top: 0;
    width: 2em;
    cursor: ns-resize;
  }

  &.-x {
    bottom: 0;
    left: 0;
    right: 0;
    height: 1.5em;
    cursor: ew-resize;
  }
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

.chart__scale-mode {
  font-size: 14px;
  display: flex;
  align-items: center;
  z-index: 3;
  cursor: pointer;

  i {
    font-size: 14px;
    margin-left: 5px;
  }

  &:hover {
    opacity: 1;
  }
}

.chart__dirty-notice {
  background-color: rgba(black, .5);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;

  z-index: 4;

  display: flex;
  align-items: center;
  justify-content: center;

  flex-direction: column;
  text-align: center;

  font-size: 1em;

  > strong {
    margin: 0 10%;
    font-weight: 600;
  }

  > p:nth-child(2) {
    margin: 1em 20%;
  }

  button {
    font-size: 1.2em;
  }
}

.chart__notice {
  position: absolute;
  z-index: 1;
  max-width: 200px;
  left: 50%;
  transform: translateX(-50%);

  text-align: center;
  font-size: .75em;
  margin-top: 1em;

  color: lighten($red, 10%);
}

.chart-controls {
  position: absolute;
  left: 0;
  right: 0;

  > div > div {
    position: relative;
  }

  &__left {
    position: absolute;
    top: 1em;
    left: 1em;
  }

  &__right {
    position: absolute;
    top: 1em;
    right: 1em;
    text-align: right;
  }
}

.highcharts-tooltip-box tspan {
  font-weight: 400 !important;
}

.highcharts-yaxis-grid path:first-child {
  display: none;
}
</style>
