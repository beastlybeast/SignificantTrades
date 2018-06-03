<template>
  <div>
    <div class="chart__detail stack__container" v-bind:class="{open: isDetailOpen}" v-bind:style="{ maxHeight: detailHeight + 'px' }">
      <div class="stack__wrapper" ref="detailWrapper">
        <a href="#" class="stack__toggler icon-cross" v-on:click="showTickDetail(false)"></a>
        <div v-if="detail">
          <div class="detail__header">
            <div class="detail__control">
              <span class="icon-up" v-on:click="moveTickDetail(-1)"></span>
              <div>
                <code>{{detail.from}}</code>
                <code>{{detail.to}}</code>
              </div>
              <span class="icon-up" v-on:click="moveTickDetail(1)"></span>
            </div>
            <div class="detail__total">
              <div>
                <span class="detail__total__label">side</span>
                <span class="detail__total__value">+{{Math.abs(detail.side * 100).toFixed()}}% <span v-bind:class="{'icon-bull': detail.side > 0, 'icon-bear': detail.side < 0}"></span></span>
              </div>
              <div>
                <span class="detail__total__label">buys</span>
                <span class="detail__total__value">{{detail.buys}} <span class="icon-currency"></span></span>
              </div>
              <div>
                <span class="detail__total__label">sells</span>
                <span class="detail__total__value">{{detail.sells}} <span class="icon-currency"></span></span>
              </div>
              <div>
                <span class="detail__total__label">size</span>
                <span class="detail__total__value">{{detail.size}} <span class="icon-commodity"></span></span>
              </div>
              <div>
                <span class="detail__total__label">trades</span>
                <span class="detail__total__value">{{detail.count}}</span>
              </div>
            </div>
          </div>
          <div class="detail__exchanges__list">
            <div class="detail__exchange detail__exchanges_header" ref="detailExchangesHeader">
              <div class="detail__exchange__name" v-on:click="handleTickDetailSort($event, 'name')">ABC</div>
              <div class="detail__exchange__price" v-on:click="handleTickDetailSort($event, 'price')">PRICE</div>
              <div class="detail__exchange__buys" v-on:click="handleTickDetailSort($event, 'buysPercentage')">BUY</div>
              <div class="detail__exchange__sells" v-on:click="handleTickDetailSort($event, 'sellsPercentage')">SELL</div>
              <div class="detail__exchange__size" v-on:click="handleTickDetailSort($event, 'size')">VOL</div>
              <div class="detail__exchange__count" v-on:click="handleTickDetailSort($event, 'count')">HIT</div>
            </div>
            <div class="detail__exchange" v-for="exchange of detail.exchanges" v-bind:key="exchange.name">
              <div class="detail__exchange__name">{{exchange.name}} <span v-bind:class="{'icon-bear': exchange.sellsPercentage > .75, 'icon-bull': exchange.buysPercentage >= .75}"></span></div>
              <div class="detail__exchange__price"><span v-if="exchange.price || exchange.changes.price"><span class="icon-currency"></span> <span v-html="exchange._price"></span> <sup v-if="exchange.changes.price" v-bind:class="{increase: exchange.changes.price > 0}">{{(exchange.changes.price * 100).toFixed(2)}} %</sup></span></div>
              <div class="detail__exchange__buys"><span v-if="exchange.buys">{{exchange._buys}} <span class="icon-commodity"></span> <sup v-if="exchange.buysPercentage" class="constant">{{(exchange.buysPercentage * 100).toFixed(2)}} %</sup></span></div>
              <div class="detail__exchange__sells"><span v-if="exchange.sells">{{exchange._sells}} <span class="icon-commodity"></span> <sup v-if="exchange.sellsPercentage" class="constant">{{(exchange.sellsPercentage * 100).toFixed(2)}} %</sup></span></div>
              <div class="detail__exchange__size"><span v-if="exchange.size || exchange.changes.size">{{exchange._size}} <span class="icon-commodity"></span> <sup v-if="exchange.changes.size" v-bind:class="{increase: exchange.changes.size > 0}">{{(exchange.changes.size * 100).toFixed(2)}} %</sup></span></div>
              <div class="detail__exchange__count"><span>{{exchange.count}} <sup v-if="exchange.changes.count" v-bind:class="{increase: exchange.changes.count > 0}">{{(exchange.changes.count * 100).toFixed(2)}} %</sup></span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="chart__container" ref="chartContainer" v-bind:class="{fetching: fetching}" v-on:mousedown="startScroll">
      <div class="chart__selection" v-bind:style="{left: selection.left, width: selection.width}"></div>
      <div class="chart__canvas"></div>
    </div>
  </div>
</template>

<script>
  import Highcharts from 'highcharts'
  import options from '../services/options'
  import socket from '../services/socket'

  export default {
    data() {
      return {
        fetching: false,
        defaultRange: 1000 * 60 * 15,
        timeframe: 10000,
        isTwitchMode: false,
        following: true,
        shiftPressed: false,
        unfinishedTick: null,
        isDetailOpen: false,
        priceLineColor: '#222',
        detailHeight: 0,
        detailSorting: {
          property: 'size',
          direction: 'desc'
        },
        detail: null,
        averages: [],
        chart: null,
        selection: {
          from: 0,
          to: 0,
          left: 0,
          right: 0,
        },
      }
    },
    created() {
      this.timestamp = +new Date();
      this.range = parseInt(this.defaultRange);

      this._trimInvisibleTradesInterval = setInterval(() => {
        if (this.following && +new Date() - this.timestamp >= 1000 * 60 * 5) {
          const min = this.chart.xAxis[0].min - this.timeframe;
          socket.trim(min);

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
      }, 60 * 1000);

      Highcharts.wrap(Highcharts.Series.prototype, 'drawGraph', function(proceed) {
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

      socket.$on('pair', (pair, initialize) => {
        if (!this.chart) {
          return;
        }

        this.chart.series[0].update({name: pair}, false);

        this.range = this.defaultRange;
        this.timeframe = 10000;
        this.canFollow(true);

        const timestamp = +new Date();

        if (!initialize) {
          for (let serie of this.chart.series) {
            serie.setData([], false);
          }

          this.chart.xAxis[0].setExtremes(timestamp - this.timeframe, timestamp, false);
        }

        this.chart.redraw();
      });

      socket.$on('history', (willReplace) => {
        if (!this.chart || !socket.trades.length) {
          return;
        }

        if (willReplace) {
          this.canFollow(true);
          this.range = socket.trades[socket.trades.length - 1][1] - socket.trades[0][1];
        }

        this.ajustTimeframe();

        this.appendTicksToChart(this.getTicks(), true);
      });

      socket.$on('trades', trades => {
        if (!this.chart) {
          return;
        }

        this.appendTicksToChart(this.getTicks(trades));
      });

      options.$on('follow', state => {
        this.canFollow(state);

        if (state) {
          this.follow(true);
        }
      });

      setTimeout(() => {
        options.$on('change', data => {
          switch (data.prop) {
            case 'exchanges':
            case 'avgPeriods':
            case 'useWeighedAverage':
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
          }
        })
      }, 1000);
    },
    mounted() {
      this.chart = Highcharts.chart(this.$el.querySelector('.chart__canvas'), {
        chart: {
          type: 'spline',
          animation: false,
          height: '100px',
          margin: [0, 0, 0, 0],
          spacingTop: 0,
          backgroundColor: 'transparent',
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
              enabled: false,
            },
            lineWidth: 0,
            tickWidth: 0,
            minPadding: 0,
            maxPadding: 0,
        },
        yAxis: [{
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
            tickAmount: 8,
        },{
            gridLineColor: 'rgba(0, 0, 0, 0)',
            startOnTick: false,
        }],
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
            return '<small>' + Highcharts.dateFormat('%H:%M:%S', this.point.x)+ '</small><br>' + this.series.name + ' ' + app.getAttribute('data-symbol') + formatPrice(this.y).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
          },
          style: {
            color: 'white',
            fontSize: 10,
            lineHeight: 12
          }
        },
        spacing:[0, 0, 0, 0],
        plotOptions: {
          series: {
            pointPadding: 0,
            groupPadding: 0,
            stickyTracking: true,
            marker: {
              enabled: false,
              lineWidth: 2,
            }
          },
          line: {
          },
          area: {
            stacking: 'normal',
          },
          spline: {
            animation: false,
            pointPlacement: 'on',
            showInLegend: false,
          },
          area: {
            animation: false,
            pointPlacement: 'on',
            showInLegend: false,
          }
        },
        series: [{
          yAxis: 1,
          zIndex: 1,
          name: 'PRICE',
          data: [],
          color: this.priceLineColor,
          animation: false,
          lineWidth: 2,
          marker: {
            symbol: 'circle',
            radius: 3,
          }
        },{
          name: 'SELL',
          stacking: 'area',
          type: 'area',
          data: [],
          color: '#f77a71',
          fillColor: '#F44336',
          animation: false,
          marker: {
            symbol: 'circle',
            radius: 3,
          }
        },{
          name: 'BUY',
          stacking: 'area',
          type: 'area',
          data: [],
          color: '#9CCC65',
          fillColor: '#7ca74e',
          animation: false,
          marker: {
            symbol: 'circle',
            radius: 3,
          }
        }],
      });

      if (window.location.hash.indexOf('twitch') !== -1) {
        this.goTwitchMode(true);
      }

      options.dark && this.toggleDark(options.dark);

      if (socket.trades && socket.trades.length > 1) {
        this.range = socket.trades[socket.trades.length - 1][1] - socket.trades[0][1];
        this.ajustTimeframe();
        this.appendTicksToChart(this.getTicks(), true);
      }

      this._doZoom = this.doZoom.bind(this);

      this.$refs.chartContainer.addEventListener('wheel', this._doZoom);

      this._doScroll = this.doScroll.bind(this);

      window.addEventListener('mousemove', this._doScroll, false);

      this._stopScroll = this.stopScroll.bind(this);

      window.addEventListener('mouseup', this._stopScroll, false);

      this._shiftTracker = (e => {
        this.shiftPressed = e.shiftKey;
      }).bind(this);

      window.addEventListener('keydown', this._shiftTracker, false);
      window.addEventListener('keyup', this._shiftTracker, false);
      window.addEventListener('blur', this._shiftTracker, false);

      this._onHashChange = (() => {
        this.goTwitchMode(window.location.hash.indexOf('twitch') !== -1);
      }).bind(this);

      window.addEventListener('hashchange', this._onHashChange, false);
    },
    beforeDestroy() {
      clearTimeout(this._flushDetailTimeout);
      clearTimeout(this._zoomAfterTimeout);
      clearInterval(this._trimInvisibleTradesInterval);

      this.$refs.chartContainer.removeEventListener('wheel', this._doZoom);
      window.removeEventListener('mousemove', this._doScroll);
      window.removeEventListener('mouseup', this._stopScroll);
      window.removeEventListener('keydown', this._shiftTracker);
      window.removeEventListener('keyup', this._shiftTracker);
      window.removeEventListener('blur', this._shiftTracker);
      window.removeEventListener('hashchange', this._onHashChange);
    },
    methods: {
      toggleDark(state) {
        window.document.body.classList[state ? 'add' : 'remove']('dark');

        this.chart.series[0].update({
          color: state ? '#fff' : '#222',
          shadow: state ? {
            color: 'rgba(255, 255, 255, .15)',
            width: 15,
            offsetX: 0,
            offsetY: 0
          } : false,
        });

        this.chart.yAxis[0].update({
          gridLineColor: state ? 'rgba(255, 255, 255, .1)' : 'rgba(0, 0, 0, .05)'
        });
      },
      showTickDetail(min, max) {
        clearTimeout(this._flushDetailTimeout);

        if (min === false) {
          this.isDetailOpen = false;

          this._flushDetailTimeout = setTimeout(() => this.detail = null, 1000);
          this.updateTickDetailCursorPosition(true);

          return;
        }

        this.detail = {
          at: min,
          from: Highcharts.dateFormat('%e. %b %H:%M:%S', min),
          to: Highcharts.dateFormat('%e. %b %H:%M:%S', max),
          exchanges: []
        }

        const timeframe = max - min;

        const a = {
          exchanges: {},
          buys: 0,
          buys_amount: 0,
          sells: 0,
          sells_amount: 0,
          count: 0,
        };

        const b = {
          exchanges: {},
          buys: 0,
          buys_amount: 0,
          sells: 0,
          sells_amount: 0,
          count: 0,
        };

        for (let trade of socket.trades) {
          if (options.exchanges.indexOf(trade[0]) === -1) {
            continue;
          }

          let control;

          if (trade[1] >= min - timeframe && trade[1] < min) {
            control = a;
          } else if (trade[1] >= min && trade[1] < min + timeframe) {
            control = b;
          } else if (trade[1] >= min + timeframe) {
            break;
          } else {
            continue;
          }

          if (!control.exchanges[trade[0]]) {
            control.exchanges[trade[0]] = {
              low: 1e6,
              high: 0,
              buys: 0,
              sells: 0,
              count: 0
            }
          }

          control.exchanges[trade[0]].count++;
          control.exchanges[trade[0]].price = +trade[2];
          control.exchanges[trade[0]][trade[4] > 0 ? 'buys' : 'sells'] += (+trade[3]);

          control.count++;
          control[trade[4] > 0 ? 'buys' : 'sells'] += (+trade[3]);
          control[(trade[4] > 0 ? 'buys' : 'sells') + '_amount'] += trade[2] * trade[3];
        }

        let exchanges = {};

        for (let control of [a, b]) {
          for (let exchange in control.exchanges) {
            if (!exchanges[exchange]) {
              exchanges[exchange] = {
                name: exchange,
                changes: {}
              }
            }

            const size = +(control.exchanges[exchange].buys + control.exchanges[exchange].sells);

            if (exchanges[exchange].size) {
              if (exchanges[exchange].price.toFixed(2) > 0)
                exchanges[exchange].changes.price = (control.exchanges[exchange].price - exchanges[exchange].price) / exchanges[exchange].price;

              if (exchanges[exchange].size.toFixed(2) > 0)
                exchanges[exchange].changes.size = (size - exchanges[exchange].size) / exchanges[exchange].size;

              if (exchanges[exchange].count.toFixed(2) > 0)
                exchanges[exchange].changes.count = (control.exchanges[exchange].count - exchanges[exchange].count) / exchanges[exchange].count;

              for (let property in exchanges[exchange].changes) {
                if ((exchanges[exchange].changes[property] * 100).toFixed(2) == 0) {
                  delete exchanges[exchange].changes[property];
                }
              }
            }

            exchanges[exchange].price = control.exchanges[exchange].price;
            exchanges[exchange].size = size;
            exchanges[exchange].buys = +control.exchanges[exchange].buys;

            exchanges[exchange].buysPercentage = control.exchanges[exchange].buys / exchanges[exchange].size;
            exchanges[exchange].sells = +control.exchanges[exchange].sells;

            exchanges[exchange].sellsPercentage = control.exchanges[exchange].sells / exchanges[exchange].size;
            exchanges[exchange].count = control.exchanges[exchange].count;
          }
        }

        this.detail.timeframe = timeframe,
        this.detail.exchanges = exchanges,

        this.detail.exchanges = Object.keys(exchanges).map(name => {
          exchanges[name]._price = formatPrice(exchanges[name].price);
          exchanges[name]._size = formatAmount(exchanges[name].size, 1);
          exchanges[name]._buys = formatAmount(exchanges[name].buys, 1);
          exchanges[name]._sells = formatAmount(exchanges[name].sells, 1);

          return exchanges[name];
        })

        this.detail.count = b.count;
        this.detail.buys = formatAmount(b.buys_amount);
        this.detail.sells = formatAmount(b.sells_amount);
        this.detail.size = formatAmount(b.buys + b.sells);
        this.detail.bull = (b.buys - a.buys) / a.buys;
        this.detail.bear = (b.sells - a.sells) / a.sells;
        this.detail.side = this.detail.bull - this.detail.bear;

        this.sortTickDetail();

        this.detailHeight = this.$refs.detailWrapper.clientHeight;
        this.isDetailOpen = true;

        if (!this.detailHeight) {
          setTimeout(() => {
            this.detailHeight = this.$refs.detailWrapper.clientHeight;
          }, 200);
        }
      },
      moveTickDetail(direction) {
        if (!this.detail) {
          return;
        }

        const minTimestamp = this.detail.at + (this.detail.timeframe * direction);
        const selectionWidth = this.selection.to - this.selection.from;

        this.selection.from += selectionWidth * direction;
        this.selection.to += selectionWidth * direction;

        this.updateTickDetailCursorPosition();
        this.showTickDetail(minTimestamp, minTimestamp + this.detail.timeframe);
      },
      updateTickDetailCursorPosition(hide = false) {
        if (hide) {
          this.$set(this.selection, 'left', '0');
          this.$set(this.selection, 'width', '0');

          return;
        }

        const min = Math.min(this.selection.from, this.selection.to);
        const max = Math.max(this.selection.from, this.selection.to);

        this.$set(this.selection, 'left', min + 'px');
        this.$set(this.selection, 'width', (max - min) + 'px');
      },
      handleTickDetailSort(event, property) {
        const direction = event.target.classList.contains('asc') ? 'desc' : 'asc';

        for (let i=0; i<event.target.parentNode.childNodes.length; i++) {
          if (!(event.target.parentNode.childNodes[i] instanceof Element)) {
            continue;
          }

          event.target.parentNode.childNodes[i].classList.remove('asc');
          event.target.parentNode.childNodes[i].classList.remove('desc');
        }

        this.sortTickDetail(property, direction);

        event.target.classList.add(direction);
      },
      sortTickDetail(property = this.detailSorting.property, direction = this.detailSorting.direction) {
        this.$set(this.detail, 'exchanges', this.detail.exchanges.sort((a, b) => {
          let _a = a[property], _b = b[property];

          if (direction === 'desc') {
            _a = b[property];
            _b = a[property];
          }

          if (typeof _a === 'string') {
            return _a > _b;
          }

          return _a - _b;
        }));

        this.detailSorting.property = property;
        this.detailSorting.direction = direction;
      },
      getTicks(input) {
        let data;

        if (input) {
          data = input.sort((a, b) => a[1] - b[1]);
        } else {
          delete this.tick;
          this.averages.splice(0, this.averages.length);
          data = socket.trades.slice(0);
        }

        data = data.filter(a => options.exchanges.indexOf(a[0]) !== -1);

        const sells = [];
        const buys = [];
        const prices = [];

        for (let i = 0; i < data.length; i++) {

          if (!this.tick || data[i][1] - this.tick.timestamp > this.timeframe) {
            if (this.tick) {
              const point = this.tickToPoint(this.tick);

              buys.push(point.buys);
              sells.push(point.sells);
              prices.push(point.price);

              this.averages.push([point.price[1], point.buys[1] + point.sells[1]]);

              if (this.averages.length > options.avgPeriods) {
                this.averages.splice(0, this.averages.length - options.avgPeriods);
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

          this.tick.exchanges[data[i][0]].prices += (data[i][2] * data[i][3]);
          this.tick.exchanges[data[i][0]].close = (+data[i][2]);
          this.tick.exchanges[data[i][0]].size += (+data[i][3]);
          this.tick.size += (+data[i][3]);
          this.tick[data[i][4] > 0 ? 'buys' : 'sells'] += (data[i][3] * data[i][2]);
        }

        return {
          sells: sells,
          buys: buys,
          prices: prices,
        };
      },
      tickToPoint(tick, getPriceIndex = true) {
        let typical = parseFloat(this.priceIndex);

        if (getPriceIndex) {
          /* simple weight average price over exchanges
          */

          const closes = [];

          for (let exchange in tick.exchanges) {
            let price = tick.exchanges[exchange].prices / tick.exchanges[exchange].size;

            if (options.useWeighedAverage) {
              closes.push([price, tick.exchanges[exchange].size]);
            } else {
              closes.push([tick.exchanges[exchange].close, tick.exchanges[exchange].size]);
            }

            tick.high = isNaN(tick.high) ? price : Math.max(tick.high, price);
            tick.low = isNaN(tick.low) ? price : Math.min(tick.low, price);
          }

          if (options.useWeighedAverage) {
            tick.close = closes.map(a => a[0] * a[1]).reduce((a, b) => a + b) / tick.size;
          } else {
            tick.close = closes.map(a => a[0]).reduce((a, b) => a + b) / closes.length;
          }

          /* get period typical price
          */
          typical = (tick.high + tick.low + tick.close) / 3;

          /* average the price
          */
          const cumulatives = this.averages.concat([[typical, tick.buys + tick.sells]]);

          if (this.averages && options.avgPeriods > 0 && cumulatives.length > 1) {
            if (options.useWeighedAverage) {
              this.priceIndex = cumulatives.map(a => a[0] * a[1]).reduce((a, b) => a + b) / cumulatives.map(a => a[1]).reduce((a, b) => a + b);
            } else {
              this.priceIndex = cumulatives.map(a => a[0]).reduce((a, b) => a + b) / cumulatives.length;
            }
          } else {
            this.priceIndex = typical;
          }

          /* determine tab lagging indicator
          */
          const lastPrices = this.chart.series[0].yData.slice(-5);
          let direction = lastPrices.length > 2 ? (this.priceIndex > lastPrices.reduce((a, b) => a + b) / lastPrices.length ? 'up' : 'down') : 'neutral';

          socket.$emit('price', this.priceIndex, direction);
        }

        return {
          buys: [tick.timestamp, tick.buys],
          sells: [tick.timestamp, tick.sells],
          price: [tick.timestamp, this.priceIndex],
        };
      },
      appendTicksToChart(ticks, replace = false) {
        const now = +new Date();
        let chartNeedsRedraw = false;
        let pointWasAdded = false;

        if (ticks.prices.length) {
          if (replace) {
            this.chart.series[0].setData(ticks.prices, false);
            this.chart.series[1].setData(ticks.sells, false);
            this.chart.series[2].setData(ticks.buys, false);
          } else {
            let i = 0;

            if (this.lastTickTimestamp === ticks.prices[i][0]) {
              this.chart.series[0].data[this.chart.series[0].data.length - 1].update(ticks.prices[i], false)
              this.chart.series[1].data[this.chart.series[1].data.length - 1].update(ticks.sells[i], false);
              this.chart.series[2].data[this.chart.series[2].data.length - 1].update(ticks.buys[i], false);

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
        }

        if (this.tick && (!this.tick.updatedAt || now > this.tick.updatedAt + 1000)) {
          const point = this.tickToPoint(this.tick);

          if (!this.chart.series[0].data.length || this.tick.timestamp > this.lastTickTimestamp) {
            this.chart.series[0].addPoint(point.price, false);
            this.chart.series[1].addPoint(point.sells, false);
            this.chart.series[2].addPoint(point.buys, false);

            pointWasAdded = true;

            this.lastTickTimestamp = point.price[0];
          } else {
            this.chart.series[0].data[this.chart.series[0].data.length - 1].update(point.price, false)
            this.chart.series[1].data[this.chart.series[1].data.length - 1].update(point.sells, false);
            this.chart.series[2].data[this.chart.series[2].data.length - 1].update(point.buys, false);
          }

          this.tick.updatedAt = now;

          chartNeedsRedraw = true;
        }

        if (chartNeedsRedraw) {
          this.chart.redraw();

          if (pointWasAdded && !this._zoomAfterTimeout && this.following && this.chart.series[0].xData.length) {
            this.follow();
          }
        }
      },
      doZoom(event, two = false) {
        this.timestamp = +new Date();

        if (this.fetching || !this.chart.series[0].xData.length) {
          return;
        }

        event.preventDefault();
        let axisMin = this.chart.xAxis[0].min;
        let axisMax = this.chart.xAxis[0].max;

        const dataMax = this.chart.series[0].xData[this.chart.series[0].xData.length - 1];

        const range = axisMax - axisMin;

        if (
          (event.deltaX || event.deltaZ || !event.deltaY)
        ) {
          return;
        }

        const delta = range * .1 * (event.deltaY > 0 ? 1 : -1);
        const deltaX = Math.min(this.chart.chartWidth / 1.5, Math.max(0, event.offsetX - this.chart.chartWidth / 3 / 2)) / (this.chart.chartWidth / 1.5);

        axisMin = axisMin - delta * deltaX;
        axisMax = Math.min(dataMax, axisMax + delta * (1 - deltaX));

        this.chart.xAxis[0].setExtremes(axisMin, axisMax);

        this.canFollow(axisMax === dataMax);

        this.range = axisMax - axisMin;

        this.updateTickDetailCursorPosition(true);

        clearTimeout(this._zoomAfterTimeout);

        this._zoomAfterTimeout = setTimeout(() => {
          delete this._zoomAfterTimeout;

          if (!this.fetching && axisMin < this.chart.series[0].xData[0]) {
            this.fetching = true;
            socket.fetch(axisMin, this.chart.series[0].xData[0])
              .then()
              .catch()
              .then(() => this.fetching = false);
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
      doScroll(event) {
        if (this.fetching || isNaN(this.scrolling) || !this.chart.series[0].xData.length) {
          return;
        }

        if (this.shiftPressed) {
          this.selection.to = event.pageX;

          this.updateTickDetailCursorPosition();

          return;
        }

        this.timestamp = +new Date();

        const range = this.chart.xAxis[0].max - this.chart.xAxis[0].min;
        const scale = (range / this.chart.chartWidth) * (this.scrolling - event.pageX);

        let axisMin = this.chart.xAxis[0].min;
        let axisMax = this.chart.xAxis[0].max;

        axisMin += scale;
        axisMax += scale;

        const dataMin = this.chart.series[0].xData[0];
        const dataMax = this.chart.series[0].xData[this.chart.series[0].xData.length - 1];

        if (axisMax > dataMax) {
          axisMax = dataMax;
          axisMin = axisMax - range;
        }

        this.canFollow(axisMax === dataMax);
        this.range = axisMax - axisMin;

        this.updateTickDetailCursorPosition(true);

        this.chart.xAxis[0].setExtremes(axisMin, axisMax);

        this.scrolling = event.pageX;
      },
      stopScroll(event) {
        if (this.scrolling) {
          if (this.shiftPressed) {
            const viewbox = this.chart.xAxis[0].max - this.chart.xAxis[0].min;

            const minPosition = Math.min(this.selection.from, this.selection.to);
            const maxPosition = Math.max(this.selection.from, this.selection.to);
            const minTimestamp = this.chart.xAxis[0].min + (minPosition / this.chart.chartWidth) * viewbox;
            const maxTimestamp = minTimestamp + (maxPosition - minPosition) / this.chart.chartWidth * viewbox;

            this.selection.from = minPosition;
            this.selection.to = maxPosition;

            this.showTickDetail(minTimestamp, maxTimestamp);

            this.canFollow(false);
          } else if (!this.fetching && this.chart.xAxis[0].min < this.chart.series[0].xData[0]) {
            this.fetching = true;

            socket.fetch(this.chart.xAxis[0].min, this.chart.series[0].xData[0], false , false)
              .then()
              .catch()
              .then(() => this.fetching = false);
          }
        }

        delete this.scrolling;
      },
      follow(redraw = false) {
        this.following = true;

        const dataMin = this.chart.series[0].xData[0];
        const dataMax = this.chart.series[0].xData[this.chart.series[0].xData.length - 1];
        const axisMin = Math.max(dataMin, dataMax - this.range);

        this.chart.xAxis[0].setExtremes(axisMin, dataMax, redraw);
      },
      canFollow(state) {
        if (this.following !== state) {
          this.timestamp = +new Date();

          options.$emit('following', state);

          this.following = state;

          state && this.updateTickDetailCursorPosition(true);
        }
      },
      getTimeframe() {
        let value = parseFloat(options.timeframe);
        let type = /\%$/.test(options.timeframe) ? 'percent' : 'length';
        let output;

        if (!value) {
          value = 1.5;
          type = 'percent';
        }

        if (type === 'percent') {
          value /= 100;

          output = this.range * value;
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
      goTwitchMode(state) {
        this.isTwitchMode = state;

        if (state) {
          window.document.body.classList.add('twitch');
          options.dark = true;
          options.maxRows = 10;
        } else {
          window.document.body.classList.remove('twitch');
        }
      }
    }
  }
</script>

<style lang="scss">
	@import '../assets/sass/variables';

  .chart__detail {
    .stack__wrapper {
      padding: 0;
    }

    .detail__header {
      padding: 10px 10px 0;

      > div {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .detail__control {
        flex-wrap: wrap;
        margin-bottom: 10px;

        code {
          display: block;
          text-align: center;
        }
      }

      .icon-up {
        font-size: 16px;
        padding: 10px;
        cursor: pointer;

        &:first-child {
          transform: rotateZ(-90deg);
        }

        &:last-child {
          transform: rotateZ(90deg);
        }
      }
    }

    .detail__total > div {
      display: flex;
      flex-direction: column;
      padding: 0 5px;

      &:first-child {
        padding-left: 0;
      }

      &:last-child {
        padding-right: 0;
      }

      span.detail__total__label {
        font-size: 10px;
        opacity: .5;
      }

      span.detail__total__value {
        font-weight: 600;
      }
    }

    .detail__exchanges__list {
      margin: 0;
      padding: 0;
      display: flex;
      flex-flow: column nowrap;
    }

    .detail__exchange {
      display: flex;
      flex-flow: row nowrap;
      padding: 24px 20px 5px;
      background-position: center center;
      background-size: cover;
      background-blend-mode: overlay;
      position: relative;
      font-size: 12px;
      background-color: white;

      &.detail__exchanges_header {
        background: none !important;
        cursor: pointer;

        .detail__exchange__name {
          bottom: 7px;
          top: auto;
          font-weight: 400;
          font-size: 9px;
          letter-spacing: normal;
        }

        > div {
          &:after {
            font-family: 'icon';
            margin-left: 2px;
            top: 1px;
            position: relative;
          }

          &.asc:after {
            content: unicode($icon-up);
          }

          &.desc:after {
            content: unicode($icon-down);
          }
        }
      }

      &:nth-child(odd) {
        background-color: rgba(black, .02);
      }

      sup {
        position: absolute;
        top: -10px;
        font-size: 10px;
        font-weight: 600;
        opacity: .5;
        color: $red;
        right: -15px;

        &.increase {
          color: $green;

          &:before {
            content: '+';
          }
        }

        &.constant {
          color: $blue;
        }
      }

      span {
        position: relative;

        &[class^="icon"] {
          font-size: 90%;
          top: 0px;
        }
      }

      > div {
        flex-grow: 1;
        flex-basis: 0;
        word-break: break-word;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: right;
      }

      .detail__exchange__name {
        position: absolute;
        top: 3px;
        left: 5px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .icon-bull {
        color: $red;
      }

      .icon-bear {
        color: $blue;
      }
    }
  }

  .chart__container {
    position: relative;
    width: calc(100% + 1px);

    .chart__selection {
      position: absolute;
      top: 0;
      bottom: 0;
      background-color: rgba(black, .1);
      z-index: 1;
      pointer-events: none;
    }

    &.fetching {
      opacity: .5;
    }

    .highcharts-credits {
      visibility: hidden;
    }
  }
</style>