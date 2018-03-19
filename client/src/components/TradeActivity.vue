<template>
  <div class="chart-container" v-on:mousedown="startScroll">
    <div class="chart-canvas"></div>
  </div>
</template>

<script>
  import Highcharts from 'highcharts';
  import socket from '../socket';
  import moment from 'moment';

  export default {
    data() {
      return {
        zoom: 1,
        range: 1000 * 60 * 20,
        timeframe: 10000,
        follow: true,
        unfinishedTick: null,
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
              startOnTick: true,
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
              let label = '';

              switch (this.series.index) {
                case 0:
                  label = 'BTCUSD';
                  break;
                case 1:
                  label = 'SELL';
                  break;
                case 2:
                  label = 'BUY';
                  break;
              }

              return '<small>' + Highcharts.dateFormat('%H:%M:%S', this.point.x)+ '</small><br>' + label + ' $' + this.y.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
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
              stickyTracking: false
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
            dashStyle: 'ShortDash',
            stacking: 'stream',
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
      // console.log('bind socket event to TradeActivity');

      socket.$on('trades', event => {
        if (!this.chart) {
          return;
        }
        
        this.updateChart(this.getTicks(event.data));
      });
    },
    mounted() {
      // console.log('mount chart...');
      this.chart = Highcharts.chart(this.$el.querySelector('.chart-canvas'), this.options);

      this.updateChart(this.getTicks(), true);

      this._doZoom = this.doZoom.bind(this);
      this._doScroll = this.doScroll.bind(this);
      this._stopScroll = this.stopScroll.bind(this);

      this.$el.addEventListener('mousewheel', this._doZoom);
      window.addEventListener('mousemove', this._doScroll);
      window.addEventListener('mouseup', this._stopScroll);
    },
    beforeDestroy() {
      this.$el.removeEventListener('mousewheel', this._doZoom);
      window.removeEventListener('mousemove', this._doScroll);
      window.removeEventListener('mouseup', this._stopScroll);
    },
    methods: {
      getTicks(input) {
        let tick, data;

        let useLastTick = false;
        let willUpdateLastTick = false;

        if (input) {
          if (this.unfinishedTick) {
            tick = this.unfinishedTick;
          }
          data = input;
        } else {
          delete this.unfinishedTick;
          data = socket.trades.slice(0);
        }

        const sells = [];
        const buys = [];
        const prices = [];

        for (let i=0; i<data.length; i++) {
          if (!tick || data[i][1] - tick.timestamps[0] > this.timeframe) {
            if (tick) {
              // console.log('tick ended, calculate close value');
              const points = this.tickToPoints(tick);

              buys.push(points.buys);
              sells.push(points.sells);
              prices.push(points.prices);

              // console.log('tick.buys: ', points.buys[1], 'tick.sells: ', points.sells[1], 'vwap: ', points.prices[1]);
            }

            // console.log('create new tick (at timestamp: ' + data[i][1] + ')');
            tick = this.unfinishedTick = {
              timestamps: [data[i][1]],
              prices: [data[i][2]],
              sizes: [data[i][3]],
              buys: 0,
              sells: 0,
            };
          } else {
            // console.log('update tick (start: ' + moment(tick.timestamps[0]).format('LTS') + ', current: ' + moment(data[i][1]).format('LTS') + ')');

            tick.timestamps.push(data[i][1]);
            tick.prices.push(data[i][2]);
            tick.sizes.push(data[i][3]);
          }

          tick[data[i][4] === 'b' ? 'buys' : 'sells'] += (data[i][3] * data[i][2]);

          // console.log('add', data[i][4] === 'b' ? 'buys' : 'sells', '(' + (data[i][3]) + ' units at price ' + data[i][2] + ')', 'to tick (total worth ' + tick[data[i][4] === 'b' ? 'buys' : 'sells'] + ')');
        }

        // console.log('tick', tick, 'this.unfinishedTick', this.unfinishedTick);
        // console.log('getTicks(input) contains', prices.length);

        return {
          useLastTick: this.unfinishedTick,
          sells: sells,
          buys: buys,
          prices: prices,
        };
      },
      tickToPoints(tick) {
        const timestamp = tick.timestamps.sort((a, b) => a - b)[0];
        const average = (tick.prices.map((price, index) => price * tick.sizes[index]).reduce((a, b) => a + b) / tick.prices.length) / (tick.sizes.reduce((a, b) => a + b) / tick.sizes.length)

        return {
          buys: [timestamp, tick.buys],
          sells: [timestamp, tick.sells],
          prices: [timestamp, average],
        };
      },
      updateChart(ticks, replace = false) {
        if (replace) {
          if (ticks && ticks.prices && ticks.prices.length) {
            this.chart.series[0].setData(ticks.prices, false);
            this.chart.series[1].setData(ticks.sells, false);
            this.chart.series[2].setData(ticks.buys, false);
            this.chart.redraw();
          }
        } else {
          for (let i=0; i<ticks.prices.length; i++) {
            // console.log('add chart tick (at index', this.chart.series[0].data.length, ')');
            this.chart.series[0].addPoint(ticks.prices[i]);
            this.chart.series[1].addPoint(ticks.sells[i]);
            this.chart.series[2].addPoint(ticks.buys[i]);
          }
        }

        if (this.unfinishedTick) {
          // console.log('unfinished tick detected !!');
          const points = this.tickToPoints(this.unfinishedTick);
          if (this.chart.series[0].data.length) {
            // console.log('update last points');
            this.chart.series[0].data[this.chart.series[0].data.length - 1].update(points.prices)
            this.chart.series[1].data[this.chart.series[1].data.length - 1].update(points.sells);
            this.chart.series[2].data[this.chart.series[2].data.length - 1].update(points.buys);
          } else {
            // console.log('series does not contains any data ===> addpoint');
            this.chart.series[0].addPoint(points.prices);
            this.chart.series[1].addPoint(points.sells);
            this.chart.series[2].addPoint(points.buys);
          }
        }

        if (this.follow && this.chart.series[0].data.length) {
          const dataMin = this.chart.series[0].data[0].category;
          const dataMax = this.chart.series[0].data[this.chart.series[0].data.length - 1].category;
          const axisMin = Math.max(dataMin, dataMax - this.range);

          this.chart.xAxis[0].setExtremes(axisMin, dataMax);
        }
      },
      doZoom(event) {
        event.preventDefault();
        let axisMin = this.chart.xAxis[0].min;
        let axisMax = this.chart.xAxis[0].max;

        const dataMin = this.chart.series[0].data[0].category;
        const dataMax = this.chart.series[0].data[this.chart.series[0].data.length - 1].category;

        const range = axisMax - axisMin;

        if (
          (event.deltaX || event.deltaZ || !event.deltaY) 
          || (event.deltaY > 0 && range >= (dataMax - dataMin))
        ) {
          // range already maxed out / deltaY too weak
          return;
        }

        const delta = range * .1 * (event.deltaY > 0 ? 1 : -1);

        axisMin = Math.max(dataMin, axisMin - delta);
        axisMax = Math.min(dataMax, axisMax + delta);

        this.chart.xAxis[0].setExtremes(axisMin, axisMax);

        this.follow = axisMax === dataMax;

        this.range = axisMax - axisMin;

        this.ajustTimeframe();
      },
      startScroll(event) {
        this.scrolling = event.pageX;
      },
      doScroll(event) {
        if (isNaN(this.scrolling)) {
          return;
        }
      
        const range = this.chart.xAxis[0].max - this.chart.xAxis[0].min;
        const scale = (range / this.chart.chartWidth) * (this.scrolling - event.pageX);

        let axisMin = this.chart.xAxis[0].min;
        let axisMax = this.chart.xAxis[0].max;

        const dataMin = this.chart.series[0].data[0].category;
        const dataMax = this.chart.series[0].data[this.chart.series[0].data.length - 1].category;

        axisMin += scale;
        axisMax += scale;

        if (axisMin < dataMin) {
          axisMin = dataMin;
          axisMax = axisMin + range;
        }

        if (axisMax > dataMax) {
          axisMax = dataMax;
          axisMin = axisMax - range;
        }

        this.follow = axisMax === dataMax;
        this.range = axisMax - axisMin;

        this.chart.xAxis[0].setExtremes(axisMin, axisMax);

        this.scrolling = event.pageX;
      },
      stopScroll(event) {
        delete this.scrolling;
      },
      ajustTimeframe() {
        const current = parseInt(this.timeframe);
        let timeframe;

        const hour = 1000 * 60 * 60;

        /*
          0-10m
            -> 10s tick
          10m-60m
            -> 30s tick
          1h-4h
            -> 1m tick
          4h-12h
            -> 5m tick
          12h-24h
            -> 15m tick
          1d-7d
            -> 1h tick
          7d-2w
            -> 4h tick
          2w+
            -> 1d tick
        */

        if (this.range < hour / 6) {
          timeframe = 10000; // 10s
        } else if (this.range < hour) {
          timeframe = 30000; // 30s
        } else if (this.range < hour * 4) {
          timeframe = 60000; // 1min
        } else if (this.range < hour * 12) {
          timeframe = 60000 * 5; // 5min
        } else if (this.range < hour * 24) {
          timeframe = 60000 * 15; // 15min
        } else if (this.range < hour * 24 * 7) {
          timeframe = 3600000; // 1h
        } else {
          timeframe = 3600000 * 24; // 1d
        }

        if (timeframe != current) {
          console.log('ajust timeframe based on range', this.range, ':', timeframe, '(was ' + current + ')');
          this.timeframe = timeframe;

          this.updateChart(this.getTicks(event.data), true);
        }
      }
    }
  }
</script>

<style lang="scss">
  .chart-container {
    position: relative;
    width: calc(100% + 1px);

    .highcharts-credits {
      visibility: hidden;
    }
  }
</style>