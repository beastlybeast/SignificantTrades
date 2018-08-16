<template>
	<div>
		<div class="chart__container" ref="chartContainer" v-bind:class="{fetching: fetching}" v-on:mousedown="startScroll">
			<div class="chart__range">
				<div>{{ rangeFrom }}</div>
				<div>{{ rangeTo }}</div>
			</div>
			<div class="chart__canvas"></div>
		</div>
		<div class="chart__height-handler" ref="chartHeightHandler" v-on:mousedown="startResize" v-on:dblclick.stop.prevent="resetHeight"></div>
	</div>
</template>

<script>
import Highcharts from 'highcharts';
import options from '../services/options';
import socket from '../services/socket';

export default {
  data() {
    return {
      fetching: false,
      defaultRange: 1000 * 60 * 15,
      timeframe: 10000,
      following: true,
      priceLineColor: '#222',
      averages: [],
      chart: null,
      rangeFrom: 0,
      rangeTo: 0
    };
  },
  created() {
    this.timestamp = +new Date();
  },
  mounted() {
    if (options.wipeCache) {
      this._trimInvisibleTradesInterval = setInterval(
        this.trimChart,
        60 * options.wipeCacheDuration * 1000
      );
    }

    Highcharts.wrap(Highcharts.Series.prototype, 'drawGraph', function(
      proceed
    ) {
      var lineWidth;

      proceed.call(this);

      if (this.graph) {
        lineWidth = this.graph.attr('stroke-width');
        if (
          /Chrome/.test(navigator.userAgent) &&
          lineWidth >= 2 &&
          lineWidth <= 6 &&
          this.graph.attr('stroke-linecap') === 'round'
        ) {
          this.graph.attr('stroke-linecap', 'square');
        }
      }
    });

    Highcharts.setOptions({
      time: {
        timezoneOffset: new Date().getTimezoneOffset()
      }
    });

    socket.$on('pairing', this.onPairing);

    socket.$on('historical', this.onFetch);

    socket.$on('trades', this.onTrades);

    options.$on('follow', this.onFollow);

    setTimeout(() => {
      options.$on('change', this.onSettings);
    }, 1000);

    this.chart = window.chart = Highcharts.chart(
      this.$el.querySelector('.chart__canvas'),
      {
        chart: {
          type: 'spline',
          animation: false,
          height: '100px',
          margin: [0, 0, 0, 0],
          spacingTop: 0,
          backgroundColor: 'transparent',
          events: {
            redraw: () => {
              if (!this.chart.xAxis[0].min || !this.chart.xAxis[0].max) {
                this.rangeFrom = '';
                this.rangeTo = '';
                return;
              }

              const from = new Date(this.chart.xAxis[0].min);
              this.rangeFrom =
                from.getHours() + ':' + window.pad(from.getMinutes(), 2);

              const to = new Date(this.chart.xAxis[0].max);
              this.rangeTo =
                to.getHours() + ':' + window.pad(to.getMinutes(), 2);
            }
          }
        },
        title: {
          text: '',
          floating: true,
          margin: 0
        },
        subtitle: {
          text: '',
          style: {
            display: 'none'
          }
        },
        rangeSelector: {
          enabled: false
        },
        legend: {
          enabled: false
        },
        xAxis: {
          categories: [],
          gridLineColor: 'transparent',
          title: {
            enabled: false,
            reserveSpace: false
          },
          labels: {
            enabled: false
          },
          lineWidth: 0,
          tickWidth: 0,
          minPadding: 0,
          maxPadding: 0
        },
        yAxis: [
          {
            gridLineColor: 'rgba(0, 0, 0, .05)',
            title: {
              enabled: false,
              reserveSpace: false
            },
            lineWidth: 0,
            tickWidth: 0,
            endOnTick: false,
            minPadding: 0,
            maxPadding: 0,
            tickAmount: 8
          },
          {
            gridLineColor: 'rgba(0, 0, 0, 0)',
            startOnTick: false
          }
        ],
        exporting: {
          enabled: false
        },
        tooltip: {
          snap: 5,
          animation: false,
          backgroundColor: 'rgba(0, 0, 0, .7)',
          borderWidth: 0,
          padding: 4,
          shadow: false,
          hideDelay: 0,
          formatter: function(e) {
            return this.point.name
              ? this.point.name
              : '<small>' +
                  Highcharts.dateFormat('%H:%M:%S', this.point.x) +
                  '</small><br>' +
                  this.series.name +
                  ' ' +
                  app.getAttribute('data-symbol') +
                  (this.series.name === 'BUY' || this.series.name === 'SELL'
                    ? formatAmount(this.y)
                    : formatPrice(this.y)
                        .toString()
                        .replace(/(\d)(?=(\d{3})+\.)/g, '$1,'));
          },
          style: {
            color: 'white',
            fontSize: 10,
            lineHeight: 12
          }
        },
        spacing: [0, 0, 0, 0],
        plotOptions: {
          series: {
            pointPadding: 0,
            groupPadding: 0,
            stickyTracking: true,
            marker: {
              enabled: false,
              lineWidth: 2
            }
          },
          area: {
            stacking: 'normal'
          },
          spline: {
            animation: false,
            pointPlacement: 'on',
            showInLegend: false
          },
          area: {
            animation: false,
            pointPlacement: 'on',
            showInLegend: false
          }
        },
        series: [
          {
            yAxis: 1,
            zIndex: 1,
            name: 'PRICE',
            data: [],
            color: this.priceLineColor,
            animation: false,
            lineWidth: 2,
            marker: {
              symbol: 'circle',
              radius: 3
            }
          },
          {
            name: 'SELL',
            stacking: 'area',
            type: 'areaspline',
            data: [],
            color: '#f77a71',
            fillColor: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [
                [0, 'rgba(244, 67, 54, .8)'],
                [1, 'rgba(244, 67, 54, .6)']
              ]
            },
            animation: false,
            marker: {
              symbol: 'circle',
              radius: 3
            }
          },
          {
            name: 'BUY',
            stacking: 'area',
            type: 'areaspline',
            data: [],
            color: '#9CCC65',
            fillColor: {
              linearGradient: { x1: 0, y1: 0, x2: 0, y2: 1 },
              stops: [
                [0, 'rgba(124, 167, 78, .8)'],
                [1, 'rgba(124, 167, 78, .6)']
              ]
            },
            animation: false,
            marker: {
              symbol: 'circle',
              radius: 3
            }
          },
          {
            type: 'scatter',
            yAxis: 1,
            data: [],
            marker: {
              enabled: true,
              lineWidth: 2,
              lineColor: 'white',
              states: {
                hover: {
                  fillColor: 'white',
                  lineColor: 'rgba(255, 255, 255, .2)',
                  lineWidth: 10
                }
              }
            }
          }
        ]
      }
    );

    options.dark && this.toggleDark(options.dark);

    this.range = +this.defaultRange;

    if (socket.trades && socket.trades.length > 1) {
      this.range =
        socket.trades[socket.trades.length - 1][1] - socket.trades[0][1];
      this.onResize();
      this.appendTicksToChart(this.getTicks(), true);
    } else {
      this.onResize();
    }

    this._onResize = this.onResize.bind(this);

    window.addEventListener('resize', this._onResize);

    this._doZoom = this.doZoom.bind(this);

    this.$refs.chartContainer.addEventListener('wheel', this._doZoom);

    this._doDrag = this.doDrag.bind(this);

    window.addEventListener('mousemove', this._doDrag, false);

    this._stopDrag = this.stopDrag.bind(this);

    window.addEventListener('mouseup', this._stopDrag, false);
    window.addEventListener('keyup', this._shiftTracker, false);
    window.addEventListener('blur', this._shiftTracker, false);
  },
  beforeDestroy() {
    socket.$off('trades', this.onTrades);
    socket.$off('historical', this.onFetch);
    socket.$off('pairing', this.onPairing);
    options.$off('change', this.onSettings);
    options.$off('follow', this.onFollow);

    clearTimeout(this._zoomAfterTimeout);
    clearInterval(this._trimInvisibleTradesInterval);

    this.$refs.chartContainer.removeEventListener('wheel', this._doZoom);

    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('mousemove', this._doScroll);
    window.removeEventListener('mouseup', this._stopScroll);
  },
  methods: {
    //                        _ _
    //   /\  /\__ _ _ __   __| | | ___ _ __ ___
    //  / /_/ / _` | '_ \ / _` | |/ _ \ '__/ __|
    // / __  / (_| | | | | (_| | |  __/ |  \__ \
    // \/ /_/ \__,_|_| |_|\__,_|_|\___|_|  |___/
    //

    onPairing(pair) {
      if (!this.chart) {
        return;
      }

      this.chart.series[0].update({ name: pair }, false);

      this.range = this.defaultRange;
      this.tick = null;
      this.averages = [];
      this.toggleFollow(true);

      const timestamp = +new Date();

      for (let serie of this.chart.series) {
        serie.setData([], false);
      }

      this.chart.xAxis[0].setExtremes(
        timestamp - this.timeframe,
        timestamp,
        false
      );

      this.chart.redraw();
    },

    onFetch(willReplace) {
      if (!this.chart || !socket.trades.length) {
        return;
      }

      if (willReplace) {
        this.toggleFollow(true);
      }

      this.ajustTimeframe();

      this.appendTicksToChart(this.getTicks(), true);

      if (willReplace) {
        this.chart.xAxis[0].setExtremes(
          Math.max(
            this.chart.series[0].xData[this.chart.series[0].xData.length - 1] -
              this.range,
            this.chart.series[0].xData[0]
          ),
          this.chart.series[0].xData[this.chart.series[0].xData.length - 1]
        );
      }
    },

    onTrades(trades) {
      if (!this.chart) {
        return;
      }

      this.appendTicksToChart(this.getTicks(trades));
    },

    onFollow(state) {
      this.toggleFollow(state);

      if (state) {
        this.snapToRight(true);
      }
    },

    onSettings(data) {
      switch (data.prop) {
        case 'filters':
        case 'avgPeriods':
        case 'useWeighedAverage':
        case 'showPlotsSignificants':
        case 'showPlotsLiquidations':
          this.appendTicksToChart(this.getTicks(), true);
          break;
        case 'timeframe':
          if (this.ajustTimeframe()) {
            this.appendTicksToChart(this.getTicks(), true);
          }
          break;
        case 'dark':
          this.toggleDark(data.value);
          break;
        case 'wipeCache':
        case 'wipeCacheDuration':
          clearInterval(this._trimInvisibleTradesInterval);

          if (options.wipeCache) {
            this._trimInvisibleTradesInterval = setInterval(
              this.trimChart,
              60 * options.wipeCacheDuration * 1000
            );
          }
          break;
      }
    },

    onResize(e) {
      if (e) {
        clearTimeout(this._onResizeTimeout);

        this._onResizeTimeout = setTimeout(this._onResize, 250);

        return;
      }

      if (!this.chart) {
        return;
      }

      this.updateChartHeight();

      if (/px$/i.test(options.timeframe)) {
        if (this.ajustTimeframe()) {
          this.appendTicksToChart(this.getTicks(), true);
        }
      }
    },

    //   _____       _                      _   _       _ _
    //   \_   \_ __ | |_ ___ _ __ __ _  ___| |_(_)_   _(_) |_ _   _
    //    / /\/ '_ \| __/ _ \ '__/ _` |/ __| __| \ \ / / | __| | | |
    // /\/ /_ | | | | ||  __/ | | (_| | (__| |_| |\ V /| | |_| |_| |
    // \____/ |_| |_|\__\___|_|  \__,_|\___|\__|_| \_/ |_|\__|\__, |
    //                                                        |___/

    doZoom(event, two = false) {
      this.timestamp = +new Date();

      if (this.fetching || !this.chart.series[0].xData.length) {
        return;
      }

      event.preventDefault();
      let axisMin = this.chart.xAxis[0].min;
      let axisMax = this.chart.xAxis[0].max;

      const dataMax = this.chart.series[0].xData[
        this.chart.series[0].xData.length - 1
      ];

      const range = axisMax - axisMin;

      if (event.deltaX || event.deltaZ || !event.deltaY) {
        return;
      }

      const delta = range * 0.1 * (event.deltaY > 0 ? 1 : -1);
      const deltaX =
        Math.min(
          this.chart.chartWidth / 1.5,
          Math.max(0, event.offsetX - this.chart.chartWidth / 3 / 2)
        ) /
        (this.chart.chartWidth / 1.5);

      axisMin = axisMin - delta * deltaX;
      axisMax = Math.min(dataMax, axisMax + delta * (1 - deltaX));

      this.chart.xAxis[0].setExtremes(axisMin, axisMax);

      this.toggleFollow(axisMax === dataMax);

      this.range = axisMax - axisMin;

      clearTimeout(this._zoomAfterTimeout);

      this._zoomAfterTimeout = setTimeout(() => {
        delete this._zoomAfterTimeout;

        if (!this.fetching && axisMin < this.chart.series[0].xData[0]) {
          if (/btcusd/i.test(options.pair)) {
            this.fetching = true;
            socket
              .fetchHistoricalData(axisMin, this.chart.series[0].xData[0])
              .then()
              .catch(() => (this.fetching = false))
              .then(() => (this.fetching = false));
          }
        } else if (this.ajustTimeframe()) {
          this.appendTicksToChart(this.getTicks(), true);
        }
      }, 500);
    },

    startScroll(event) {
      if (event.which === 3) {
        return;
      }

      this.scrolling = event.pageX;

      if (this.shiftPressed) {
        this.selection.from = event.pageX;
      }
    },

    doDrag(event) {
      if (!isNaN(this.resizing)) {
        this.doResize(event);
      } else if (
        this.scrolling &&
        !this.fetching &&
        this.chart.series[0].xData.length
      ) {
        this.doScroll(event);
      }
    },

    doScroll(event) {
      this.timestamp = +new Date();

      const range = this.chart.xAxis[0].max - this.chart.xAxis[0].min;
      const scale =
        range / this.chart.chartWidth * (this.scrolling - event.pageX);

      let axisMin = this.chart.xAxis[0].min;
      let axisMax = this.chart.xAxis[0].max;

      axisMin += scale;
      axisMax += scale;

      const dataMin = this.chart.series[0].xData[0];
      const dataMax = this.chart.series[0].xData[
        this.chart.series[0].xData.length - 1
      ];

      if (axisMax > dataMax) {
        axisMax = dataMax;
        axisMin = axisMax - range;
      }

      this.toggleFollow(axisMax === dataMax);
      this.range = axisMax - axisMin;

      this.chart.xAxis[0].setExtremes(axisMin, axisMax);

      this.scrolling = event.pageX;
    },

    stopDrag(event) {
      if (
        this.scrolling &&
        !this.fetching &&
        this.chart.xAxis[0].min < this.chart.series[0].xData[0]
      ) {
        if (/btcusd/i.test(options.pair)) {
          this.fetching = true;

          socket
            .fetchHistoricalData(
              this.chart.xAxis[0].min,
              this.chart.series[0].xData[0],
              false,
              false
            )
            .then()
            .catch()
            .then(() => (this.fetching = false));
        }
      }

      if (this.resizing) {
        options.height = this.chart.chartHeight;
      }

      delete this.scrolling;
      delete this.resizing;
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
      options.height = null;

      this.updateChartHeight();
    },

    updateChartHeight() {
      const w = document.documentElement.clientWidth || innerWidth;
      const h = document.documentElement.clientHeight || innerHeight;

      if (options.height > 0) {
        this.chart.setSize(
          w,
          options.height,
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

    //  _____ _      _
    // /__   (_) ___| | _____ _ __
    //   / /\/ |/ __| |/ / _ \ '__|
    //  / /  | | (__|   <  __/ |
    //  \/   |_|\___|_|\_\___|_|
    //

    getTicks(input) {
      var id = btoa(Math.random()).substring(0, 12);
      let data;

      if (input) {
        data = input.sort((a, b) => a[1] - b[1]);
      } else {
        delete this.tick;
        this.averages.splice(0, this.averages.length);
        data = socket.trades.slice(0);
      }

      data = data.filter(a => options.filters.indexOf(a[0]) === -1);

      const sells = [];
      const buys = [];
      const prices = [];
      const labels = [];

      for (let i = 0; i < data.length; i++) {
        if (data[i][5]) {
          switch (+data[i][5]) {
            case 1:
              options.showPlotsLiquidations &&
                labels.push(
                  this.createPoint(
                    data[i],
                    `${formatAmount(
                      data[i][2] * data[i][3],
                      1
                    )}${app.getAttribute('data-symbol')} liquidated <b>${
                      data[i][4] == 1 ? 'SHORT' : 'LONG'
                    }</b>`,
                    '#E91E63'
                  )
                );
              break;
          }

          continue;
        }

        if (!this.tick || data[i][1] - this.tick.timestamp > this.timeframe) {
          if (this.tick) {
            const point = this.tickToPoint(this.tick);

            buys.push(point.buys);
            sells.push(point.sells);
            prices.push(point.price);

            this.averages.push([
              point.price[1],
              point.buys[1] + point.sells[1]
            ]);

            if (this.averages.length > options.avgPeriods) {
              this.averages.splice(
                0,
                this.averages.length - options.avgPeriods
              );
            }
          }

          this.tick = {
            timestamp: +data[i][1],
            exchanges: {},
            buys: 0,
            sells: 0,
            size: 0
          };
        }

        if (!this.tick.exchanges[data[i][0]]) {
          this.tick.exchanges[data[i][0]] = {
            prices: 0,
            size: 0
          };
        }

        this.tick.exchanges[data[i][0]].prices += data[i][2] * data[i][3];
        this.tick.exchanges[data[i][0]].close = +data[i][2];
        this.tick.exchanges[data[i][0]].size += +data[i][3];
        this.tick.size += +data[i][3];
        this.tick[data[i][4] > 0 ? 'buys' : 'sells'] += data[i][3] * data[i][2];

        if (
          options.showPlotsSignificants &&
          data[i][3] * data[i][2] >= options.hugeTradeThreshold
        ) {
          labels.push(this.createPoint(data[i]));
        }
      }

      return {
        sells: sells,
        buys: buys,
        prices: prices,
        labels: labels
      };
    },

    tickToPoint(tick, getPriceIndex = true) {
      let typical = parseFloat(this.priceIndex);

      if (getPriceIndex) {
        /* simple weight average price over exchanges
					*/

        const closes = [];

        for (let exchange in tick.exchanges) {
          let price =
            tick.exchanges[exchange].prices / tick.exchanges[exchange].size;

          if (options.useWeighedAverage) {
            closes.push([price, tick.exchanges[exchange].size]);
          } else {
            closes.push([
              tick.exchanges[exchange].close,
              tick.exchanges[exchange].size
            ]);
          }

          tick.high = isNaN(tick.high) ? price : Math.max(tick.high, price);
          tick.low = isNaN(tick.low) ? price : Math.min(tick.low, price);
        }

        if (options.useWeighedAverage) {
          tick.close =
            closes.map(a => a[0] * a[1]).reduce((a, b) => a + b) / tick.size;
        } else {
          tick.close =
            closes.map(a => a[0]).reduce((a, b) => a + b) / closes.length;
        }

        /* get period typical price
					*/
        typical = (tick.high + tick.low + tick.close) / 3;

        /* average the price
					*/
        const cumulatives = this.averages.concat([
          [typical, tick.buys + tick.sells]
        ]);

        if (this.averages && options.avgPeriods > 0 && cumulatives.length > 1) {
          if (options.useWeighedAverage) {
            this.priceIndex =
              cumulatives.map(a => a[0] * a[1]).reduce((a, b) => a + b) /
              cumulatives.map(a => a[1]).reduce((a, b) => a + b);
          } else {
            this.priceIndex =
              cumulatives.map(a => a[0]).reduce((a, b) => a + b) /
              cumulatives.length;
          }
        } else {
          this.priceIndex = typical;
        }

        /* determine tab lagging indicator
					*/
        const lastPrices = this.chart.series[0].yData.slice(-5);
        let direction =
          lastPrices.length > 2
            ? this.priceIndex >
              lastPrices.reduce((a, b) => a + b) / lastPrices.length
              ? 'up'
              : 'down'
            : 'neutral';

        socket.$emit('price', this.priceIndex, direction);
      }

      return {
        buys: [tick.timestamp, tick.buys],
        sells: [tick.timestamp, tick.sells],
        price: [tick.timestamp, this.priceIndex]
      };
    },

    createPoint(trade, label = null, color = null) {
      label =
        label ||
        `${trade[4] == 1 ? 'Buy' : 'Sell'} ${formatAmount(
          trade[2] * trade[3]
        )}${app.getAttribute('data-symbol')} @ ${app.getAttribute(
          'data-symbol'
        )}${formatPrice(trade[2]).replace(/(\d)(?=(\d{3})+\.)/g, '$1,')}`;
      let fill = color || (trade[4] == 1 ? '#7ca74e' : '#F44336');

      return {
        x: +trade[1],
        y: +trade[2],
        marker: {
          radius: Math.max(
            5,
            Math.log(
              1 +
                trade[2] *
                  trade[3] /
                  (options.thresholds[2] - options.thresholds[0])
            ) * 6
          ),
          symbol: trade[5]
            ? 'diamond'
            : trade[4] == 1 ? 'triangle' : 'triangle-down',
          fillColor: fill
        },
        name: label
      };
    },

    appendTicksToChart(ticks, replace = false) {
      const now = +new Date();

      let chartNeedsRedraw = false;
      let pointWasAdded = false;
      let i = 0;

      if (ticks.prices.length) {
        if (replace) {
          const min = this.chart.xAxis[0].min;
          const max = this.chart.xAxis[0].max;
          this.chart.xAxis[0].setExtremes(null, null, false);
          this.chart.series[0].setData(ticks.prices, false);
          this.chart.series[1].setData(ticks.sells, false);
          this.chart.series[2].setData(ticks.buys, false);
          this.chart.series[3].setData(ticks.labels, false);
          this.chart.redraw();
          this.chart.xAxis[0].setExtremes(min, max, false);
        } else {
          if (this.lastTickTimestamp === ticks.prices[i][0]) {
            this.chart.series[0].data[
              this.chart.series[0].data.length - 1
            ].update(ticks.prices[i], false);
            this.chart.series[1].data[
              this.chart.series[1].data.length - 1
            ].update(ticks.sells[i], false);
            this.chart.series[2].data[
              this.chart.series[2].data.length - 1
            ].update(ticks.buys[i], false);

            i++;
          }

          for (; i < ticks.prices.length; i++) {
            this.chart.series[0].addPoint(ticks.prices[i], false);
            this.chart.series[1].addPoint(ticks.sells[i], false);
            this.chart.series[2].addPoint(ticks.buys[i], false);

            pointWasAdded = true;
          }
        }

        this.lastTickTimestamp = ticks.prices[ticks.prices.length - 1][0];

        chartNeedsRedraw = true;
      } else if (replace) {
        this.chart.series[0].setData([], false);
        this.chart.series[1].setData([], false);
        this.chart.series[2].setData([], false);
        this.chart.series[3].setData([], false);

        chartNeedsRedraw = true;
      }

      if (ticks.labels.length && !replace) {
        for (i = 0; i < ticks.labels.length; i++) {
          this.chart.series[3].addPoint(ticks.labels[i]);
        }
      }

      if (
        this.tick &&
        (!this.tick.updatedAt || now > this.tick.updatedAt + 1000)
      ) {
        const point = this.tickToPoint(this.tick);

        if (
          !this.chart.series[0].data.length ||
          this.tick.timestamp > this.lastTickTimestamp
        ) {
          this.chart.series[0].addPoint(point.price, false);
          this.chart.series[1].addPoint(point.sells, false);
          this.chart.series[2].addPoint(point.buys, false);

          pointWasAdded = true;

          this.lastTickTimestamp = point.price[0];
        } else {
          this.chart.series[0].data[
            this.chart.series[0].data.length - 1
          ].update(point.price, false);
          this.chart.series[1].data[
            this.chart.series[1].data.length - 1
          ].update(point.sells, false);
          this.chart.series[2].data[
            this.chart.series[2].data.length - 1
          ].update(point.buys, false);
        }

        this.tick.updatedAt = now;

        chartNeedsRedraw = true;
      }

      if (chartNeedsRedraw) {
        this.chart.redraw();

        if (
          pointWasAdded &&
          !this._zoomAfterTimeout &&
          this.following &&
          this.chart.series[0].xData.length
        ) {
          this.snapToRight(true);
        }
      }
    },

    getTimeframe() {
      let value = parseFloat(options.timeframe);
      let type = /\%$/.test(options.timeframe)
        ? 'percent'
        : /\px$/i.test(options.timeframe) ? 'width' : 'time';
      let output;

      if (!value) {
        value = 1.5;
        type = 'percent';
      }

      if (type === 'percent') {
        value /= 100;

        if (this.chart) {
          output;
        }
        output = this.range * value;
      } else if (type === 'width') {
        output = value / this.chart.chartWidth * this.range;
      } else {
        output = value * 1000;
      }

      return parseInt(Math.max(5000, output));
    },

    ajustTimeframe() {
      const timeframe = this.getTimeframe();

      if (timeframe != this.timeframe) {
        this.timeframe = timeframe;

        return true;
      }

      return false;
    },

    trimChart() {
      if (this.following && +new Date() - this.timestamp >= 1000 * 60 * 5) {
        const min = this.chart.xAxis[0].min - this.timeframe;
        socket.trimTradesData(min);

        this.chart.series.forEach(serie => {
          serie.data.filter(a => a.x < min).forEach(point => {
            if (!point) {
              return;
            }

            point.remove(false);
          });
        });

        this.chart.redraw();
      }
    },

    snapToRight(redraw = false) {
      this.following = true;

      const dataMin = this.chart.series[0].xData[0];
      const dataMax = this.chart.series[0].xData[
        this.chart.series[0].xData.length - 1
      ];
      const axisMin = Math.max(dataMin, dataMax - this.range);

      this.chart.xAxis[0].setExtremes(axisMin, dataMax, redraw);
    },

    //         _
    //   /\/\ (_)___  ___
    //  /    \| / __|/ __|
    // / /\/\ \ \__ \ (__
    // \/    \/_|___/\___|
    //

    toggleFollow(state) {
      if (this.following !== state) {
        this.timestamp = +new Date();

        options.$emit('following', state);

        this.following = state;
      }
    },

    toggleDark(state) {
      window.document.body.classList[state ? 'add' : 'remove']('dark');

      this.chart.series[0].update({
        color: state ? '#fff' : '#222',
        shadow: state
          ? {
              color: 'rgba(255, 255, 255, .1)',
              width: 15,
              offsetX: 0,
              offsetY: 0
            }
          : false
      });

      this.chart.series[3].update({
        shadow: state
          ? {
              color: 'rgba(255, 255, 255, .1)',
              width: 15,
              offsetX: 0,
              offsetY: 0
            }
          : false
      });

      this.chart.yAxis[0].update({
        gridLineColor: state ? 'rgba(255, 255, 255, .1)' : 'rgba(0, 0, 0, .05)'
      });
    }
  }
};
</script>

<style lang='scss'>
@import '../assets/sass/variables';

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
</style>