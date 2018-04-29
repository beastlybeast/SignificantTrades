<template>
  <div>
    <div class="chart__detail stack__container" v-bind:class="{open: isDetailOpen}" v-bind:style="{ maxHeight: detailHeight + 'px' }">
      <div class="stack__wrapper" ref="detailWrapper">
        <a href="#" class="stack__toggler icon-times" v-on:click="isDetailOpen = false"></a>
        <div v-if="detail">
          <div class="detail__header">
            <p><code>{{+detail.from}}</code> ({{detail.length}} tick)</p>
          </div>
          <div class="detail__exchanges__list">
            <div class="detail__exchange detail__exchanges_header" ref="detailExchangesHeader">
              <div class="detail__exchange__price" v-on:click="handleTickDetailSort($event, 'price')">PRICE</div>
              <div class="detail__exchange__buys" v-on:click="handleTickDetailSort($event, 'buys')">BUYS</div>
              <div class="detail__exchange__sells" v-on:click="handleTickDetailSort($event, 'sells')">SELLS</div>
              <div class="detail__exchange__size" v-on:click="handleTickDetailSort($event, 'size')">SIZE</div>
              <div class="detail__exchange__count" v-on:click="handleTickDetailSort($event, 'count')">TRADES</div>
            </div>
            <div class="detail__exchange" v-for="exchange of detail.exchanges" v-bind:key="exchange.name">
              <div class="detail__exchange__name">{{exchange.name}}</div>
              <div class="detail__exchange__price"><span v-if="exchange.price || exchange.priceChange"><span class="icon-currency"></span> {{exchange.price}} <sup v-if="exchange.priceChange" v-bind:class="{increase: exchange.priceChange > 0}">{{exchange.priceChange}} %</sup></span></div>
              <div class="detail__exchange__buys"><span v-if="exchange.buys || exchange.buysChange">{{exchange.buys}} <span class="icon-commodity"></span> <sup v-if="exchange.buysChange" v-bind:class="{increase: exchange.buysChange > 0}">{{exchange.buysChange}} %</sup></span></div>
              <div class="detail__exchange__sells"><span v-if="exchange.sells || exchange.sellsChange">{{exchange.sells}} <span class="icon-commodity"></span> <sup v-if="exchange.sellsChange" v-bind:class="{increase: exchange.sellsChange > 0}">{{exchange.sellsChange}} %</sup></span></div>
              <div class="detail__exchange__size"><span v-if="exchange.size || exchange.sizeChange">{{exchange.size}} <span class="icon-commodity"></span> <sup v-if="exchange.sizeChange" v-bind:class="{increase: exchange.sizeChange > 0}">{{exchange.sizeChange}} %</sup></span></div>
              <div class="detail__exchange__count"><span>{{exchange.count}} <sup v-if="exchange.countChange" v-bind:class="{increase: exchange.countChange > 0}">{{exchange.countChange}} %</sup></span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="chart__container" ref="chartContainer" v-bind:class="{fetching: fetching}" v-on:mousedown="startScroll">
      <div class="chart__canvas"></div>
    </div>
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
        range: 1000 * 60 * 5,
        timeframe: 10000,
        following: true,
        unfinishedTick: null,
        isDetailOpen: false,
        detailHeight: 0,
        detailSorting: {
          property: 'price',
          direction: 'desc'
        },
        detail: null,
        averages: {
          prices: [],
          sizes: [],
        },
        chart: null,
        options: {
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
              animation: false,
              stickyTracking: false,
              point: {
                events: {
                  click: e => {
                    e.point.select();

                    this.showTickDetail(e.point);
                  }
                }
              }
            },
            area: {
              stacking: 'normal',
            },
            column: {
              stacking: 'percent',
              dataLabels: {
                enabled: false,
              }
            },
            spline: {
              animation: false,
              pointPlacement: 'on',
              showInLegend: false,
              marker: {
                enabled: false
              }
            },
            area: {
              animation: false,
              pointPlacement: 'on',
              showInLegend: false,
              marker: {
                enabled: false
              }
            }
          },
          series: [{
            yAxis: 1,
            zIndex: 1,
            name: 'PRICE',
            data: [],
            color: '#222',
            // dashStyle: 'ShortDash',
            animation: false,
            lineWidth: 2,
          },{
            name: 'SELL',
            stacking: 'area',
            type: 'area',
            data: [],
            color: '#E57373',
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
            fillColor: '#7CB342',
            animation: false,
            marker: {
              symbol: 'circle',
              radius: 3,
            }
          }]
        }
      }
    },
    created() {
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

        this.range = 1000 * 60 * 5;
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

      socket.$on('history', replace => {
        if (!this.chart || !socket.trades.length) {
          return;
        }
        
        if (replace) {
          const min = +socket.trades[0][1];
          const max = +socket.trades[socket.trades.length - 1][1];

          this.chart.xAxis[0].setExtremes(min, max, false);
          this.range = max - min;
          this.canFollow(true);
        }
        
        this.ajustTimeframe();
        
        this.updateChart(this.getTicks(), true);
      });

      socket.$on('trades', trades => {
        if (!this.chart) {
          return;
        }

        this.updateChart(this.getTicks(trades));
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
            case 'averageLength':
              this.updateChart(this.getTicks(), true);
            break;
            case 'tickLength':
              if (this.ajustTimeframe()) {
                this.updateChart(this.getTicks(), true);
              }
            break;
          }
        })
      }, 1000);
    },
    mounted() {
      this.options.series[0].name = options.pair;
      this.chart = Highcharts.chart(this.$el.querySelector('.chart__canvas'), this.options);

      if (socket.trades && socket.trades.length > 1) {
        this.range = socket.trades[socket.trades.length - 1][1] - socket.trades[0][1];
        this.ajustTimeframe();
        this.updateChart(this.getTicks(), true);
      }

      this._doZoom = this.doZoom.bind(this);
      this._doScroll = this.doScroll.bind(this);
      this._stopScroll = this.stopScroll.bind(this);

      this.$refs.chartContainer.addEventListener('mousewheel', this._doZoom);
      window.addEventListener('mousemove', this._doScroll);
      window.addEventListener('mouseup', this._stopScroll);
    },
    beforeDestroy() {
      this.$refs.chartContainer.removeEventListener('mousewheel', this._doZoom);
      window.removeEventListener('mousemove', this._doScroll);
      window.removeEventListener('mouseup', this._stopScroll);

      clearInterval(this.redrawInterval);
    },
    methods: {
      showTickDetail(point) {
        const from = point.x;
        const index = point.series.xData.indexOf(point.x);

        const a = {
          trades: [],
          exchanges: [],
        };

        const b = {
          trades: [],
          exchanges: [],
        };

        for (let trade of socket.trades) {
          let control;

          if (trade[1] >= point.x - this.timeframe && trade[1] < point.x) {
            control = a;
          } else if (trade[1] >= point.x && trade[1] < point.x + this.timeframe) {
            control = b;
          } else if (trade[1] >= point.x + this.timeframe) {
            break;
          } else {
            continue;
          }

          control.trades.push(trade);
          
          if (!control.exchanges[trade[0]]) {
            control.exchanges[trade[0]] = {
              prices: [],
              sizes: [],
              buys: 0,
              sells: 0,
              count: 0
            }
          }

          control.exchanges[trade[0]].count++;
          control.exchanges[trade[0]].prices.push(+trade[2]);
          control.exchanges[trade[0]].sizes.push(+trade[3]);
          control.exchanges[trade[0]][trade[4] > 0 ? 'buys' : 'sells'] += (+trade[3]);
        }

        const exchanges = [];

        for (let control of [a, b]) {
          for (let exchange in control.exchanges) {
            if (!exchanges[exchange]) {
              exchanges[exchange] = {
                name: exchange
              }
            }
            
            control.exchanges[exchange].price = (control.exchanges[exchange].prices.map((price, index) => price * control.exchanges[exchange].sizes[index])).reduce((a, b) => a + b) / (control.exchanges[exchange].buys + control.exchanges[exchange].sells);
            
            if (exchanges[exchange].price) {
              exchanges[exchange].priceChange = ((control.exchanges[exchange].price - exchanges[exchange].price) / exchanges[exchange].price * 100).toFixed(2);
              
              if (exchanges[exchange].priceChange == 0) {
                delete exchanges[exchange].priceChange;
              }
            }
            exchanges[exchange].price = formatPrice(control.exchanges[exchange].price);

            if (exchanges[exchange].buys) {
              exchanges[exchange].buysChange = ((control.exchanges[exchange].buys - exchanges[exchange].buys) / exchanges[exchange].buys * 100).toFixed(2);
              
              if (exchanges[exchange].buysChange == 0) {
                delete exchanges[exchange].buysChange;
              }
            }
            exchanges[exchange].buys = +control.exchanges[exchange].buys.toFixed(2);

            if (exchanges[exchange].sells) {
              exchanges[exchange].sellsChange = ((control.exchanges[exchange].sells - exchanges[exchange].sells) / exchanges[exchange].sells * 100).toFixed(2);
              
              if (exchanges[exchange].sellsChange == 0) {
                delete exchanges[exchange].sellsChange;
              }
            }
            exchanges[exchange].sells = +control.exchanges[exchange].sells.toFixed(2);

            if (exchanges[exchange].size) {
              exchanges[exchange].sizeChange = (((control.exchanges[exchange].buys + control.exchanges[exchange].sells) - exchanges[exchange].size) / exchanges[exchange].size * 100).toFixed(2);
              
              if (exchanges[exchange].sizeChange == 0) {
                delete exchanges[exchange].sizeChange;
              }
            }
            exchanges[exchange].size = +(control.exchanges[exchange].buys + control.exchanges[exchange].sells).toFixed(2);

            if (exchanges[exchange].count) {
              exchanges[exchange].countChange = ((control.exchanges[exchange].count - exchanges[exchange].count) / exchanges[exchange].count * 100).toFixed(2);
              
              if (exchanges[exchange].countChange == 0) {
                delete exchanges[exchange].countChange;
              }
            }
            exchanges[exchange].count = control.exchanges[exchange].count;
          }
        }

        let length = (this.timeframe / 1000).toFixed() + 's';

        if (this.timeframe > 1000 * 60) {
          length = (this.timeframe / (1000 * 60)).toFixed(2) + 'min';
        }

        this.detail = {
          from: new Date(point.x),
          to: new Date(point.x + this.timeframe),
          length: length,
          price: point.series.chart.series[0].yData[index],
          buys: point.series.chart.series[1].yData[index],
          sells: point.series.chart.series[2].yData[index],
          trades: b.trades,
          exchanges: Object.keys(exchanges).map(name => exchanges[name]).sort((a, b) => b.price - a.price),
        }
        
        this.sortTickDetail();

        this.detailHeight = this.$refs.detailWrapper.clientHeight;
        this.isDetailOpen = true;

        if (!this.detailHeight) {
          setTimeout(() => {
            this.detailHeight = this.$refs.detailWrapper.clientHeight;
          }, 200);
        }
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
          return direction === 'asc' ? a[property] - b[property] : b[property] - a[property];
        }));

        this.detailSorting.property = property;
        this.detailSorting.direction = direction;
      },
      getTicks(input) {
        let tick, data;

        let useLastTick = false;
        let willUpdateLastTick = false;

        if (input) {
          if (this.unfinishedTick) {
            tick = this.unfinishedTick;
          }
          data = input.sort((a, b) => a[1] - b[1]);
        } else {
          delete this.unfinishedTick;
          this.averages.prices.splice(0, this.averages.prices.length);
          this.averages.sizes.splice(0, this.averages.sizes.length);
          data = socket.trades.slice(0);
        }

        data = data.filter(a => options.exchanges.indexOf(a[0]) !== -1);

        const sells = [];
        const buys = [];
        const prices = [];

        for (let i=0; i<data.length; i++) {

          if (!tick || data[i][1] - tick.timestamps[0] > this.timeframe) {
            if (tick) {
              const points = this.tickToPoints(tick);

              this.averages.prices.push(points.prices[1])
              this.averages.sizes.push(tick.sizes.reduce((a, b) => a + b));

              if (this.averages.prices.length > options.averageLength) {
                this.averages.prices = this.averages.prices.splice(options.averageLength * -1);
                this.averages.sizes = this.averages.sizes.splice(options.averageLength * -1);
              }

              buys.push(points.buys);
              sells.push(points.sells);
              prices.push(points.prices);
            }

            tick = this.unfinishedTick = {
              timestamps: [+data[i][1]],
              prices: [+data[i][2]],
              sizes: [+data[i][3]],
              buys: 0,
              sells: 0,
            };

          } else {
            if (data[i][1] < tick.timestamps[0]) {
              data[i][1] = tick.timestamps[0];
            }
            tick.timestamps.push(+data[i][1]);
            tick.prices.push(+data[i][2]);
            tick.sizes.push(+data[i][3]);
          }

          tick[data[i][4] > 0 ? 'buys' : 'sells'] += (data[i][3] * data[i][2]);
        }

        return {
          useLastTick: this.unfinishedTick,
          sells: sells,
          buys: buys,
          prices: prices,
        };
      },
      tickToPoints(tick) {
        const timestamp = tick.timestamps.sort((a, b) => a - b)[0];

        /* get tick weighed average
        */
        let sizes = [tick.sizes.reduce((a, b) => a + b)];
        let prices = [(tick.prices.map((price, index) => price * tick.sizes[index])).reduce((a, b) => a + b) / sizes[0]];
        let average;

        let direction = 'neutral';

        if (this.averages.prices.length > 1) {
          direction = prices[0] > ((this.averages.prices[this.averages.prices.length - 1] + this.averages.prices[this.averages.prices.length - 2]) / 2) ? 'up' : 'down';
        }

        socket.$emit('price', prices[0], direction);

        if (options.averageLength > 0) {
          
          /* get smoothed weighed average
          */
          prices = prices.concat(this.averages.prices.slice(options.averageLength * -1));
          sizes = sizes.concat(this.averages.sizes.slice(options.averageLength * -1));

          average = (prices.map((price, index) => price * sizes[index])).reduce((a, b) => a + b) / sizes.reduce((a, b) => a + b);
        
        } else {
          average = prices[0];
        }

        return {
          buys: [timestamp, tick.buys],
          sells: [timestamp, tick.sells],
          prices: [timestamp, average],
        };
      },
      updateChart(ticks, replace = false) {
        if (replace) {
          this.chart.series[0].setData(ticks.prices, false);
          this.chart.series[1].setData(ticks.sells, false);
          this.chart.series[2].setData(ticks.buys, false);

          this.chart.redraw();
        } else {
          for (let i=0; i<ticks.prices.length; i++) {
            this.chart.series[0].addPoint(ticks.prices[i], false);
            this.chart.series[1].addPoint(ticks.sells[i], false);
            this.chart.series[2].addPoint(ticks.buys[i], false);
          }

          this.chart.redraw();
        }

        if (this.unfinishedTick) {
          const points = this.tickToPoints(this.unfinishedTick);

          if (this.chart.series[0].data.length && !replace) {
            this.chart.series[0].data[this.chart.series[0].data.length - 1].update(points.prices, false)
            this.chart.series[1].data[this.chart.series[1].data.length - 1].update(points.sells, false);
            this.chart.series[2].data[this.chart.series[2].data.length - 1].update(points.buys, false);
          } else {
            this.chart.series[0].addPoint(points.prices, false);
            this.chart.series[1].addPoint(points.sells, false);
            this.chart.series[2].addPoint(points.buys, false);
          }

          this.chart.redraw();
        }

        if (this.following && this.chart.series[0].xData.length) {
          this.follow();
        }
      },
      doZoom(event) {
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
        
        clearInterval(this.doZoomAfterTimeout);

        this.doZoomAfterTimeout = setTimeout(() => {
          if (!this.fetching && axisMin < this.chart.series[0].xData[0]) {
            this.fetching = true;
            socket.fetch(axisMin, this.chart.series[0].xData[0]).then().catch().then(() => this.fetching = false);
          } else if (this.ajustTimeframe()) {
            this.updateChart(this.getTicks(), true);
          }
        }, 250);
      },
      startScroll(event) {
        this.scrolling = event.pageX;
      },
      doScroll(event) {
        if (this.fetching || isNaN(this.scrolling) || !this.chart.series[0].xData.length) {
          return;
        }

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

        this.chart.xAxis[0].setExtremes(axisMin, axisMax);

        this.scrolling = event.pageX;
      },
      stopScroll(event) {
        if (this.scrolling && !this.fetching && this.chart.xAxis[0].min < this.chart.series[0].xData[0]) {
          this.fetching = true;

          socket.fetch(this.chart.xAxis[0].min, this.chart.series[0].xData[0]).then().catch().then(() => this.fetching = false);
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
          options.$emit('following', state);

          this.following = state;
        }
      },
      getTickLength() {
        let value = parseFloat(options.tickLength);
        let type = /\%$/.test(options.tickLength) ? 'percent' : 'length';
        let output;

        if (!value) {
          value = .1;
          type = 'percent';
        }

        if (type === 'percent') {
          if (value >= .5)
            value /= 100;

          output = this.range * value;
        } else {
          output = value;
        }

        return parseInt(Math.max(10000, output));
      },
      ajustTimeframe() {
        const timeframe = this.getTickLength();

        if (timeframe != this.timeframe) {
          this.timeframe = timeframe;

          return true;
        }

        return false;
      }
    }
  }
</script>

<style lang="scss">
	@import '../assets/sass/variables';

  .chart__detail {
    background-color: white;
    
    .stack__wrapper {
      padding: 0;
    }

    .detail__header {
      padding: 20px 20px 0;

      p {
        margin: 0;
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
        color: black !important;
        cursor: pointer;

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

      &:hover {
        background-color: #222;
        color: white;

        sup {
          opacity: 1;
        }
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
      }

      span {
        position: relative;
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
    }
  }

  .chart__container {
    position: relative;
    width: calc(100% + 1px);

    &.fetching {
      opacity: .5;
    }

    .highcharts-credits {
      visibility: hidden;
    }
  }
</style>