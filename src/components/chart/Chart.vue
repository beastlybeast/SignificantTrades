<template>
	<div>
		<div class="chart__container" ref="chartContainer" v-bind:class="{fetching: fetching}">
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

Indicators(Highcharts);

export default {
  data() {
    return {
      fetching: false,
			chart: null,
      tick: null,
      cursor: null
    };
  },
  computed: {
    ...mapState([
      'timeframe',
      'filters',
      'isSnaped',
      'chartHeight',
			'autoWipeCache',
			'autoWipeCacheDuration',
		])
  },
  created() {
    socket.$on('trades', this.onTrades);

    socket.$on('pairing', this.onPairing);
    
    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'setTimeframe':
          this.setTimeframe(mutation.payload);
          break;
        case 'toggleSnap':
          mutation.payload && this.snapRight(true);
          break;
      }
    });
  },
	mounted() {
    console.log('MOUNTED!');
    this.createChart();

    this._doDrag = this.doDrag.bind(this);

    window.addEventListener('mousemove', this._doDrag, false);

    this._stopDrag = this.stopDrag.bind(this);

    window.addEventListener('mouseup', this._stopDrag, false);

    if (this.timeframe) {
      this.setTimeframe(this.timeframe);
    }
	},	
  beforeDestroy() {
    console.info('DESTROY');

    this.chart.destroy();

    delete this.chart;
    
    socket.$off('trades', this.onTrades);

    socket.$off('historical', this.onFetch);

    socket.$off('pairing', this.onPairing);

    window.removeEventListener('mousemove', this._doDrag);
    window.removeEventListener('mouseup', this._stopDrag);

    this.onStoreMutation();
  },
  methods: {
    createChart() {
      this.chart = Highcharts.stockChart(this.$el.querySelector('.chart__canvas'), JSON.parse(JSON.stringify(chartOptions)));

      if (this.chartHeight) {
        this.updateChartHeight();
      }
    },
    setTimeframe(timeframe) {
      if (!this.chart) {
        return;
      }

      const count = (this.chart.chartWidth - 20 * .1) / 20;
      const range = timeframe * count;

      const now = +new Date();

      this.chart.xAxis[0].setExtremes(now - range, now, true);

      socket.fetchRangeIfNeeded(range, timeframe).then(trades => {
        // this.stopTickInterval();
        
          console.log('clear all chart DATA');
        for (let serie of this.chart.series) {
          serie.setData([], false);
        }

        this.tickData = null;

        this.chart.redraw();

        if (!socket.trades.length) {
          return;
        }

        this.cursor = Math.floor(socket.trades[0][1] / this.timeframe) * this.timeframe;

        this.tickTrades(socket.trades);

        // this.startTickInterval();
      })
    },
    onPairing(pair, canFetch) {
      this.chart.series[1].update({
        tooltip: {
          valuePrefix: app.getAttribute('data-symbol')
        }
      });

      this.chart.series[2].update({
        tooltip: {
          valuePrefix: app.getAttribute('data-symbol')
        }
      });
    },
    onTrades(trades) {
      if (!this.chart || !this.timeframe) {
        return;
      }

      this.tickTrades(trades);
    },
    tickTrades(trades, live = false) {
      if (!this.chart || !this.timeframe) {
        return;
      }

      const ticks = [];

      trades = trades
        .filter(a =>
            a[1] >= this.cursor // only process trades >= current tick time
            && this.filters.indexOf(a[0]) === -1 // only process trades from enabled exchanges
            && socket.ids.indexOf(a[0]) !== -1 // only process trades from known exchanges
        );

      if (!trades || !trades.length) {
        return;
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

          if (!this.tickData.exchanges[trades[i][0]]) {
            this.tickData.exchanges[trades[i][0]] = {
              open: +trades[i][2],
              high: +trades[i][2],
              low: +trades[i][2],
              close: +trades[i][2],
              size: 0
            };
          }

          this.tickData.exchanges[trades[i][0]].high = Math.max(this.tickData.exchanges[trades[i][0]].high, +trades[i][2]);
          this.tickData.exchanges[trades[i][0]].low = Math.min(this.tickData.exchanges[trades[i][0]].low, +trades[i][2]);
          this.tickData.exchanges[trades[i][0]].close = +trades[i][2];
          this.tickData.exchanges[trades[i][0]].size += +trades[i][3];
          this.tickData.size += +trades[i][3];
          this.tickData[trades[i][4] > 0 ? 'buys' : 'sells'] += trades[i][3] * trades[i][2];
        }

        if (i) {
          trades.splice(0, i);
        }

        ticks.push(this.formatTickData(this.tickData));
      }

      if (ticks.length && ticks[0].added) {        
        const tickPoints = this.getTickPoints();

        if (!tickPoints.buys) {
          debugger;
        }
      
        tickPoints.buys.update(ticks[0].buys[1], live);
        tickPoints.sells.update(ticks[0].sells[1], live);
        tickPoints.ohlc.update(ticks[0].ohlc, live);

        ticks.splice(0, 1);
      }
      
      for (let i = 0; i < ticks.length; i++) {
        this.addTickToSeries(ticks[i], live, i == ticks.length - 1);
      }

      this.chart.redraw();

      this.tickData.added = true;
    },
    getTickPoints() {
      return {
        ohlc: this.chart.series[0].points[this.chart.series[0].points.length - 1],
        buys: this.chart.series[1].points[this.chart.series[1].points.length - 1],
        sells: this.chart.series[2].points[this.chart.series[2].points.length - 1]
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

      let exchanges = {};

      if (this.tickData) {
        for (let exchange in this.tickData.exchanges) {
          this.tickData.exchanges[exchange].size *= .25;
          this.tickData.exchanges[exchange].open = this.tickData.exchanges[exchange].close;
          this.tickData.exchanges[exchange].high = this.tickData.exchanges[exchange].close;
          this.tickData.exchanges[exchange].low = this.tickData.exchanges[exchange].close;
        }
        this.tickData.timestamp = this.cursor;
        this.tickData.count = 0;
        this.tickData.buys = 0;
        this.tickData.sells = 0;
        this.tickData.open = parseFloat(this.tickData.close);
        this.tickData.high = 0;
        this.tickData.low = 0;
        this.tickData.close = 0;
        this.tickData.added = false;
      } else {
        this.tickData = {
          count: 0,
          timestamp: this.cursor,
          exchanges: {},
          buys: 0,
          sells: 0,
          size: 0,
          open: null,
          high: null,
          low: null,
          close: null,
          added: false,
        }
      }
    },
    addTickToSeries(tick, live = false, snap = false) {
      this.chart.series[0].addPoint(tick.ohlc, live);
      this.chart.series[1].addPoint(tick.buys, live);
      this.chart.series[2].addPoint(tick.sells, live);

      if (snap && this.isSnaped) {
        this.snapRight(live);
      }
    },
    formatTickData(tickData) {
      const ohlc = this.getTickDataAveraged(tickData);

      return {
        buys: [tickData.timestamp, tickData.buys],
        sells: [tickData.timestamp, tickData.sells],
        ohlc: [tickData.timestamp, ohlc.open, ohlc.high, ohlc.low, ohlc.close],
        added: tickData.added
      }
    },
    getTickDataAveraged(tickData) {
      let totalWeight = 0;

      tickData.open = tickData.high = tickData.low = tickData.close = 0;

      for (let exchange in tickData.exchanges) {
        let exchangeWeight = tickData.exchanges[exchange].size / tickData.size;

        tickData.open += tickData.exchanges[exchange].open * exchangeWeight;
        tickData.high += tickData.exchanges[exchange].high * exchangeWeight;
        tickData.low += tickData.exchanges[exchange].low * exchangeWeight;
        tickData.close += tickData.exchanges[exchange].close * exchangeWeight;
        
        totalWeight += exchangeWeight;
      }

      tickData.open /= totalWeight;
      tickData.high /= totalWeight;
      tickData.low /= totalWeight;
      tickData.close /= totalWeight;

      tickData.high = Math.max(tickData.open, tickData.low, tickData.high, tickData.close);
      tickData.low = Math.min(tickData.open, tickData.low, tickData.high, tickData.close);

      return tickData;
    },
    startResize(event) {
      if (event.which === 3) {
        return;
      }

      this.resizing = event.pageY;
    },

    doResize(event) {
      this.chart.setSize(
        document.documentElement.clientWidth,
        this.chart.chartHeight + (event.pageY - this.resizing),
        false
      );

      this.resizing = event.pageY;
    },

    resetHeight(event) {
      delete this.resizing;

      this.$store.commit('setChartHeight', null);

      this.updateChartHeight();
    },

    updateChartHeight() {
      const w = document.documentElement.clientWidth || innerWidth;
      const h = document.documentElement.clientHeight || innerHeight;

      if (this.chartHeight > 0) {
        this.chart.setSize(
          w,
          this.chartHeight,
          false
        );
      } else {
        this.chart.setSize(
          w,
          +Math.min(w / 3, Math.max(100, h / 3)).toFixed(),
          false
        );
      }
    },
    createAndAppendEmptyTick() {
      this.createTick();

      const tick = this.formatTickData(this.tickData);

      this.addTickToSeries(tick);

      this.tickData.added = true;

      this.chart.redraw();
    },

    doDrag(event) {
      if (!isNaN(this.resizing)) {
        this.doResize(event);
      }
    },

    stopDrag(event) {
      if (this.resizing) {
        this.$store.commit('setChartHeight', this.chart.chartHeight);
      }

      delete this.resizing;
    },

    snapRight(redraw = false) {
      const axis = this.chart.xAxis[0].getExtremes();
      const now = +new Date();
      const diff = now - axis.max;
      this.chart.xAxis[0].setExtremes(axis.min + diff, axis.max + diff, redraw);
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
    }*/
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
}

.chart_timeframe {
  position: absolute;
  margin: 10px;
  z-index: 1;
}

.highcharts-tooltip-box tspan {
  font-weight: 400 !important;
}
</style>
