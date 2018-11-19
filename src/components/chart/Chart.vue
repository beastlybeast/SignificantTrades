<template>
	<div id="chart">
		<div class="chart__container" ref="chartContainer" v-bind:class="{fetching: fetching}" v-bind:style="{ height: chartHeight }">
			<!-- <div class="chart__range">
				<div>{{ rangeFrom }}</div>
				<div>{{ rangeTo }}</div>
			</div> -->
			<div class="chart__canvas"></div>
		</div>
		<div class="chart__height-handler" ref="chartHeightHandler" v-on:mousedown="startResize" v-on:dblclick.stop.prevent="resetHeight"></div>
	</div>
</template>

<script>
import { mapState } from 'vuex';

import socket from "../../services/socket";
import chartOptions from "./options.json";

import Highcharts from 'highcharts/highstock';
import Indicators from 'highcharts/indicators/indicators';
import EMA from 'highcharts/indicators/ema';

Indicators(Highcharts);
EMA(Highcharts);

export default {
  data() {
    return {
      fetching: false,
			chart: null,
      tick: null,
      cursor: null,
      range: 0,
      queue: []
    };
  },
  computed: {
    ...mapState([
      'timeframe',
      'dark',
      'actives',
      'exchanges',
      'isSnaped',
      'chartHeight',
      'chartRange',
      'chartLiquidations',
      'chartPadding'
		])
  },
  created() {
    Highcharts.SVGRenderer.prototype.symbols.rip = function(x, y, w, h) {
      return ['M', x + 2, y + h / 3, 'L', x + w - 2, y + h / 3, 'M', x + w / 2, y, 'L', x + w / 2, y + h, 'z'];
    };

    if (Highcharts.VMLRenderer) {
      Highcharts.VMLRenderer.prototype.symbols.rip = Highcharts.SVGRenderer.prototype.symbols.rip;
    }

    Highcharts.wrap(Highcharts.Chart.prototype, 'pan', this.doPan(this));

    socket.$on('trades.queued', this.onTrades);

    socket.$on('pairing', this.onPairing);

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'setTimeframe':
          this.setTimeframe(mutation.payload);
          break;
        case 'toggleSnap':
          mutation.payload && this.snapRight(true);
          break;
        case 'reloadExchangeState':
        case 'chartLiquidations':
        case 'toggleLiquidationsPlot':
        case 'setChartPadding':
          // this.buildExchangesSeries();
          this.setTimeframe(this.timeframe);
          break;
        case 'trimChart':

          break;
        case 'toggleDark':
          this.createChart();
          this.setTimeframe(this.timeframe);
        break;
      }
    });
  },
	mounted() {
    this.$refs.chartContainer.style.height = this.getChartSize().height;

    window.setTimeout(() => this.createChart());

    this._doResize = this.doResize.bind(this);

    window.addEventListener('resize', this._doResize, false);

    this._doDrag = this.doDrag.bind(this);

    window.addEventListener('mousemove', this._doDrag, false);

    this._stopDrag = this.stopDrag.bind(this);

    window.addEventListener('mouseup', this._stopDrag, false);

    // this.$el.addEventListener('wheel', this.doZoom);

    // this.buildExchangesSeries();

    this.setTimeframe(this.timeframe);
	},
  beforeDestroy() {
    this.destroyChart();

    socket.$off('trades.queued', this.onTrades);

    socket.$off('historical', this.onFetch);

    socket.$off('pairing', this.onPairing);

    window.removeEventListener('resize', this._doResize);
    window.removeEventListener('mousemove', this._doDrag);
    window.removeEventListener('mouseup', this._stopDrag);

    // this.$el.removeEventListener('wheel', this.doZoom);

    this.onStoreMutation();
  },
  methods: {
    createChart() {
      this.destroyChart();

      const options = this.getChartOptions();

      console.log('new c hart');
      this.chart = Highcharts.stockChart(this.$el.querySelector('.chart__canvas'), options);

      this.updateChartHeight();

      if (this.chartRange) {
        this.setRange(this.chartRange);
      }
    },
    destroyChart() {
      if (!this.chart) {
        return;
      }

      console.log('destroy chart');
      
      this.chart.destroy();
      delete this.chart;
    },
    setTimeframe(timeframe) {
      console.log('setTimeframe', timeframe);

      const count = ((this.chart ? this.chart.chartWidth : this.$refs.chartContainer.offsetWidth) * (1 - this.chartPadding) - 20 * .1) / 10;
      const range = timeframe * 2 * count;

      const now = +new Date();

      socket.fetchRangeIfNeeded(range, timeframe).then(trades => {
        this.setRange(range / 2);

        // this.stopTickInterval();

        console.log('(chart redraw)', socket.trades.length, 'trades, ', 'timeframe: ' + this.timeframe, '(range: ' + this.chartRange + ')');

        if (this.chart) {
          for (let serie of this.chart.series) {
            serie.setData([], false);
          }

          this.tickData = null;

          this.chart.redraw();
        }

        if (!socket.trades.length) {
          return;
        }

        this.cursor = Math.floor(socket.trades[0][1] / this.timeframe) * this.timeframe;

        this.tickTrades(socket.trades);

        // this.startTickInterval(); // will fill the gaps when low trades volume & low timeframe
      })
    },
    onPairing(pair, canFetch) {
      /* this.chart.series[1].update({
        tooltip: {
          valuePrefix: app.getAttribute('data-symbol')
        }
      });

      this.chart.series[2].update({
        tooltip: {
          valuePrefix: app.getAttribute('data-symbol')
        }
      }); */
    },
    onTrades(trades) {
      this.tickTrades(trades);
    },
    tickTrades(trades, live = false) {
      const ticks = [];

      trades = trades
        .filter(a =>
            a[1] >= this.cursor // only process trades >= current tick time
            && this.actives.indexOf(a[0]) !== -1 // only process trades from enabled exchanges (client side)
        );

      if (!trades || !trades.length) {
        return;
      }

      if (this.isPanned()) {
        this.queue = this.queue.concat(trades);

        return;
      } else if (this.queue.length) {
        console.log('apply queued', this.queue.length);
        trades = this.queue.splice(0, this.queue.length).concat(trades);
      }

      // define range rounded to the timeframe
      const from = Math.floor(trades[0][1] / this.timeframe) * this.timeframe;
      const to = Math.ceil(+new Date() / this.timeframe) * this.timeframe;

      for (let t = from; t < to; t += this.timeframe) {
        let i;

        if (!this.tickData || this.cursor < t) {
          this.createTick(t);
        }

        for (i = 0; i < trades.length; i++) {
          if (trades[i][1] >= t + this.timeframe) {
            break;
          }

          if (this.tickData.open === null) {
            this.tickData.open = this.tickData.high = this.tickData.low = this.tickData.close = +trades[i][2];
          }

          if (trades[i][5]) {
            switch (+trades[i][5]) {
              case 1:
                if (this.chartLiquidations) {
                  this.tickData.liquidations += trades[i][3] * trades[i][2];

                  /* this.tickData.markers.push({
                    x: trades[i][1],
                    label: `${app.getAttribute('data-symbol')}${this.$root.formatAmount(trades[i][2] * trades[i][3], 1)} liquidated <b>${trades[i][4] == 1 ? 'SHORT' : 'LONG'}</b>`,
                    symbol: 'rip'
                  }); */
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
                life: 1,
                size: 0
              };
            }

            this.tickData.exchanges[trades[i][0]].life = 1;
            this.tickData.exchanges[trades[i][0]].count++;

            this.tickData.exchanges[trades[i][0]].high = Math.max(this.tickData.exchanges[trades[i][0]].high, +trades[i][2]);
            this.tickData.exchanges[trades[i][0]].low = Math.min(this.tickData.exchanges[trades[i][0]].low, +trades[i][2]);
            this.tickData.exchanges[trades[i][0]].close = +trades[i][2];
            this.tickData.exchanges[trades[i][0]].size += +trades[i][3];
          }

          this.tickData[(trades[i][4] > 0 ? 'buys' : 'sells') + 'Count']++;
          this.tickData[trades[i][4] > 0 ? 'buys' : 'sells'] += trades[i][3] * trades[i][2];
        }

        if (i) {
          trades.splice(0, i);
        }

        ticks.push(this.formatTickData(this.tickData));
      }
      if (live) {
        console.info('livemode');
      }
      if (ticks.length && ticks[0].added) {
        this.updateCurrentTick(ticks[0], live);
        // let serie;

        /* for (let exchange of this.actives) {
          serie = this.chart.series[this.actives.indexOf(exchange) + 4];

          serie && ticks[0].exchanges[exchange] && serie.points[serie.points.length - 1].update(ticks[0].exchanges[exchange][1], false);
        } */

        ticks.splice(0, 1);
      }

      for (let i = 0; i < ticks.length; i++) {
        this.addTickToSeries(ticks[i], live, i == ticks.length - 1);
      }

      this.chart.redraw();

      this.tickData.added = true;
      this.tickData.markers.splice(0, this.tickData.markers.length);

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
        this.cursor = timestamp;
      } else if (this.cursor) {
        this.cursor += this.timeframe;
      } else {
        this.cursor = Math.floor(+new Date() / this.timeframe) * this.timeframe;
      }

      if (this.tickData) {
        this.tickData.timestamp = this.cursor;
        this.tickData.markers = [];

        for (let exchange in this.tickData.exchanges) {
          this.tickData.exchanges[exchange].count = 0;
          this.tickData.exchanges[exchange].life *= 1;
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
          markers: [],
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
      }
    },
    addTickToSeries(tick, live = false, snap = false) {
      this.chart.series[0].addPoint(tick.ohlc, live);
      this.chart.series[1].addPoint(tick.buys, live);
      this.chart.series[2].addPoint(tick.sells, live);

      if (this.chartLiquidations) {
        this.chart.series[3].addPoint(tick.liquidations, live);
      }

      /* for (let exchange of this.actives) {
        this.chart.series[this.actives.indexOf(exchange) + 4] && this.chart.series[this.actives.indexOf(exchange) + 4].addPoint(tick.exchanges[exchange]);
      } */

      if (tick.markers.length) {
        this.processTickMarkers(tick);
      }

      if (snap && this.isSnaped) {
        this.snapRight(live);
      }
    },
    updateCurrentTick(tick, live = false) {
      const tickPoints = this.getCurrentTickPoints();

      if (this.chartLiquidations) {
        tickPoints.liquidations.update(tick.liquidations[1], live);
      }

      tickPoints.buys.update(tick.buys[1], live);
      tickPoints.sells.update(tick.sells[1], live);
      tickPoints.ohlc.update(tick.ohlc, live);

      if (tick.markers.length) {
        this.processTickMarkers(tick);
      }
    },
    processTickMarkers(tick) {
      if (!tick.markers.length) {
        return;
      }

      tick.markers.forEach(marker =>
        this.createMarker(marker.x || tick.ohlc[0], marker.y || tick.ohlc[4], marker.label, marker.symbol)
      )
    },
    createMarker(x, y, label, symbol) {
      const point = {
        x: x,
        y: y,
        marker: {
          radius: 8,
          lineWidth: 4,
          symbol: symbol,
          fillColor: 'white'
        },
        name: label
      };

      this.chart.series[4].addPoint(point);
    },

    formatTickData(tickData) {
      const ohlc = this.getTickDataAveraged(tickData);
      /* const exchanges = [];

      for (let exchange of this.actives) {
        exchanges[exchange] = [
          tickData.timestamp,
          tickData.exchanges[exchange] ?
            (tickData.exchanges[exchange].close + tickData.exchanges[exchange].high + tickData.exchanges[exchange].low) / 3
          :
            null
        ]
      } */

      return {
        buys: [tickData.timestamp, tickData.buys],
        sells: [tickData.timestamp, tickData.sells],
        liquidations: [tickData.timestamp, tickData.liquidations],
        ohlc: [
          tickData.timestamp,
          (ohlc.open),
          (ohlc.high),
          (ohlc.low),
          (ohlc.close)
        ],
        markers: tickData.markers,
        // exchanges: exchanges,
        added: tickData.added
      }
    },
    getTickDataAveraged(tickData) {
      let totalWeight = 0;
      let setOpen = false;

      if (tickData.open === null) {
        setOpen = true;
        tickData.open = 0;
      }

      let high = 0;
      let low = 0;

      tickData.close = 0;

      for (let exchange in tickData.exchanges) {
        let exchangeWeight = tickData.exchanges[exchange].life;

        if (setOpen) {
          tickData.open += tickData.exchanges[exchange].open * exchangeWeight;
        }

        high += tickData.exchanges[exchange].high * exchangeWeight;
        low += tickData.exchanges[exchange].low * exchangeWeight;
        tickData.close += ((tickData.exchanges[exchange].close + tickData.exchanges[exchange].high + tickData.exchanges[exchange].low) / 3) * exchangeWeight;

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

      return tickData;
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

    getChartSize() {
      const w = this.$refs.chartContainer.offsetWidth;
      const h = document.documentElement.clientHeight;

      return {
        width: w,
        height: this.chartHeight > 0 ? this.chartHeight : +Math.min(w / 3, Math.max(100, h / 3)).toFixed()
      };
    },
    createAndAppendEmptyTick() {
      this.createTick();

      const tick = this.formatTickData(this.tickData);

      this.addTickToSeries(tick);

      this.tickData.added = true;

      this.chart.redraw();
    },

    doResize(event) {
      clearTimeout(this._resizeTimeout);

      this._resizeTimeout = setTimeout(this.updateChartHeight.bind(this), 250);
    },

    doZoom(event, two = false) {
      this.timestamp = +new Date();

      if (!this.chart.series[0].xData.length) {
        return;
      }

      event.preventDefault();
      let axisMin = this.chart.xAxis[0].min;
      let axisMax = this.chart.xAxis[0].max;

      if (event.deltaX || event.deltaZ || !event.deltaY) {
        return;
      }

      const multiplier = (event.deltaY > 0 ? 1 : -1);

      let range = (axisMax - axisMin) * .05;

      this.chart.xAxis[0].setExtremes(axisMin - range * multiplier, axisMax + range * multiplier);

      axisMin = this.chart.yAxis[0].min;
      axisMax = this.chart.yAxis[0].max;

      range = (axisMax - axisMin) * .02;

      this.chart.yAxis[0].setExtremes(axisMin - range * multiplier, axisMax + range * multiplier);

    },

    doPan(self) {
      return function(proceed, event, arg, c) {
        if (!self.chart) {
          return;
        }

        clearTimeout(this._panTimeout);

        this._panTimeout = setTimeout(() => {
          self.$store.commit('toggleSnap', !self.isPanned());
        }, 200);

        return proceed.call(self.chart, event, arg);
      };
    },

    doDrag(event) {
      if (!isNaN(this.resizing)) {
        console.log('doDrag', 'origin:', this.resizing, this.chart.chartHeight + (event.pageY - this.resizing));
        this.updateChartHeight(this.chart.chartHeight + (event.pageY - this.resizing));

        this.resizing = event.pageY;
      }
    },

    stopDrag(event) {
      if (this.resizing) {
        this.$store.commit('setChartHeight', this.chart.chartHeight);
      }

      delete this.resizing;
    },

    snapRight(redraw = false) {
      const now = +new Date();
      const margin = this.chartRange * this.chartPadding;
      
      this.chart.xAxis[0].setExtremes(now - this.chartRange + margin, now + margin, redraw);

    },

    buildExchangesSeries() {
      for (let i = 4; i < this.chart.series.length; i++) {
        this.chart.series[i].remove();
      }

      for (let exchange of this.actives) {
        this.chart.addAxis({
          id: exchange + '-axis',
          visible: false,
          height: '33%',
        }, false);

        this.chart.addSeries({
          type: 'spline',
          name: exchange,
          yAxis: exchange + '-axis',
          data: []
        }, false);
      }

      setTimeout(() => this.setTimeframe(this.timeframe), 100);
    }

    /*stopTickInterval() {

      console.log('STOP TICK INTERVAL / TIMEOUT');

      clearTimeout(this._tickTimeout);
      clearInterval(this._tickInterval);
    },*/
    /*tickInterval() {
      const now = +new Date();
      const timeToFirstTick = Math.ceil(now / this.timeframe) * this.timeframe;

      console.log('tickInterval: schedule first tick in ', (timeToFirstTick - now) + 'ms');

      this.createAndAppendEmptyTick();

      this._tickTimeout = setTimeout(() => {
        console.log('create first tick');

        console.log('start interval every', (this.timeframe) + 'ms');
        this._tickInterval = setInterval(() => {
          console.log('interval -> tick');
          this.createTick();

          const tick = this.formatTickData(this.tickData);

          this.chart.series[0].addPoint(tick.ohlc, false);
          this.chart.series[1].addPoint(tick.buys, false);
          this.chart.series[2].addPoint(tick.sells, false);

          this.tickData.added = true;

          this.chart.redraw();
        }, this.timeframe);
      }, timeToFirstTick - now);
    }*/,
    isPanned() {
      return !this.chart || !this.chart.series.length || (
        this.chart.series[0].points.length
        && this.chart.series[0].xData.length
        && this.chart.series[0].points[this.chart.series[0].points.length - 1].x < this.chart.series[0].xData[this.chart.series[0].xData.length - 1]
      )
    },
    setRange(range) {
      const now = +new Date();

      console.log('save range', range);
      this.$store.commit('setChartRange', range);

      if (this.chart) {
        const margin = this.chartRange * this.chartPadding;
        
        this.chart.xAxis[0].update({
            overscroll: margin
        });

        this.chart.xAxis[0].setExtremes(now - this.chartRange + margin, now + margin, true);
      }
    },
    getChartOptions() {
      const options = JSON.parse(JSON.stringify(chartOptions));
      const theme = options.themes[this.dark ? 'dark' : 'bright'];
      
      options.xAxis.labels.color = theme.labels;
      options.xAxis.crosshair.color = theme.crosshair;
      options.yAxis[0].labels.color = theme.labels;
      options.yAxis[0].gridLineColor = theme.gridline;
      options.yAxis[0].crosshair.color = theme.crosshair;
      options.series[1].gridLineColor = theme.gridline;
      options.series[0].upColor = theme.up;
      options.series[0].upLineColor = theme.upLine;
      options.series[0].color = theme.down;
      options.series[0].lineColor = theme.downLine;
      options.series[1].color = theme.buysLine;
      options.series[1].fillColor = {
        linearGradient: {
          x1: 0, y1: 0, x2: 0, y2: 1
        },
        stops: [[0, theme.buysGradient[0]], [1, theme.buysGradient[1]]]
      };
      options.series[2].color = theme.sellsLine;
      options.series[2].fillColor = {
        linearGradient: {
          x1: 0, y1: 0, x2: 0, y2: 1
        },
        stops: [[0, theme.sellsGradient[0]], [1, theme.sellsGradient[1]]]
      };
      options.series[3].color = theme.liquidations;
      options.series[4].lineColor = theme.priceMA;
      options.series[5].lineColor = theme.sellsMA;
      options.series[6].lineColor = theme.buysMA;

      return options;
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

  .highcharts-container {
    width: 100% !important;
  }

  .chart__selection {
    position: absolute;
    top: 0;
    bottom: 0;
    background-color: rgba(black, 0.1);
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

.chart__height-handler {
  position: absolute;
  height: 8px;
  left: 0;
  margin-top: -4px;
  right: 0;
  z-index: 1;
  cursor: ns-resize;

  @media screen and (min-width: 768px) {
    display: none;
  }
}

.chart_timeframe {
  position: absolute;
  margin: 10px;
  z-index: 1;
}

.highcharts-tooltip-box tspan {
  font-weight: 400 !important;
}

.highcharts-yaxis-grid path:first-child {
  display: none;
}
</style>
