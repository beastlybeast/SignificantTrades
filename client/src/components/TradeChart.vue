<template>
  <div class="chart-container" v-on:mousedown="startScroll">
    <div class="chart-canvas"></div>
  </div>
</template>

<script>
  import Highcharts from 'highcharts';
  import options from '../services/options';
  import socket from '../services/socket';

  export default {
    data() {
      return {
        zoom: 1,
        range: 1000 * 60 * 5,
        timeframe: 10000,
        follow: true,
        unfinishedTick: null,
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
      socket.$on('pair', pair => {
        if (!this.chart) {
          return;
        }

        this.chart.series[0].update({name: pair}, false);
      });

      socket.$on('trades', trades => {
        if (!this.chart) {
          return;
        }

        this.updateChart(this.getTicks(trades));
      });

      options.$on('change', data => {
        switch (data.prop) {
          case 'exchanges':
          case 'averageLength':
            this.updateChart(this.getTicks(), true);
          break;
        }
      })
    },
    mounted() {
      this.options.series[0].name = options.pair;
      this.chart = Highcharts.chart(this.$el.querySelector('.chart-canvas'), this.options);

      //this.redrawInterval = setInterval(this.chart.redraw.bind(this.chart), 1000);

      if (socket.trades && socket.trades.length > 1) {
        this.range = socket.trades[socket.trades.length - 1][2] - socket.trades[0][2];
        this.ajustTimeframe();
        this.updateChart(this.getTicks(), true);
      }

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

      clearInterval(this.redrawInterval);
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
          data = input.sort((a, b) => a[2] - b[2]);
        } else {
          delete this.unfinishedTick;
          this.averages.prices.splice(0, this.averages.prices.length);
          this.averages.sizes.splice(0, this.averages.sizes.length);
          data = socket.trades.slice(0);
        }

        data = data.filter(a => options.exchanges.indexOf(a[0]) !== -1);

        const min = this.chart.series[0].data.length ? this.chart.series[0].data[this.chart.series[0].data.length - 1].category : 0;

        const sells = [];
        const buys = [];
        const prices = [];

        for (let i=0; i<data.length; i++) {

          if (!tick || data[i][2] - tick.timestamps[0] > this.timeframe) {
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
              timestamps: [data[i][2]],
              prices: [data[i][3]],
              sizes: [data[i][4]],
              buys: 0,
              sells: 0,
            };

          } else {
            if (data[i][2] < tick.timestamps[0]) {
              data[i][2] = tick.timestamps[0];
            }
            tick.timestamps.push(data[i][2]);
            tick.prices.push(data[i][3]);
            tick.sizes.push(data[i][4]);
          }

          tick[data[i][5] ? 'buys' : 'sells'] += (data[i][4] * data[i][3]);
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

        if (options.averageLength) {
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
        if (ticks.prices.length && !replace && this.ajustTimeframe()) {
          return this.updateChart(this.getTicks(), true);
        }

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

          socket.$emit('price', points.prices[1]);

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

        if (this.follow && this.chart.series[0].data.length) {
          const dataMin = this.chart.series[0].data[0].category;
          const dataMax = this.chart.series[0].data[this.chart.series[0].data.length - 1].category;
          const axisMin = Math.max(dataMin, dataMax - this.range);

          this.chart.xAxis[0].setExtremes(axisMin, dataMax, false);
        }
      },
      doZoom(event) {
        if (!this.chart.series[0].data.length) {
          return;
        }

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
          return;
        }

        const delta = range * .1 * (event.deltaY > 0 ? 1 : -1);

        axisMin = Math.max(dataMin, axisMin - delta);
        axisMax = Math.min(dataMax, axisMax + delta);

        this.chart.xAxis[0].setExtremes(axisMin, axisMax);

        this.follow = axisMax === dataMax;

        this.range = axisMax - axisMin;

        if (this.ajustTimeframe()) {
          this.updateChart(this.getTicks(), true);
        }
      },
      startScroll(event) {
        this.scrolling = event.pageX;
      },
      doScroll(event) {
        if (isNaN(this.scrolling) || !this.chart.series[0].data.length) {
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

        if (this.range < hour / 6) {
          timeframe = 15000; // 10s
        } else if (this.range < hour / 2) {
          timeframe = 20000; // 20s
        } else if (this.range < hour) {
          timeframe = 30000; // 30s
        } else if (this.range < hour * 2) {
          timeframe = 60000; // 1min
        } else if (this.range < hour * 6) {
          timeframe = 60000 * 5; // 5min
        } else if (this.range < hour * 12) {
          timeframe = 60000 * 15; // 15min
        } else if (this.range < hour * 24) {
          timeframe = 60000 * 30; // 30min
        } else if (this.range < hour * 24 * 7) {
          timeframe = 3600000; // 1h
        } else {
          timeframe = 3600000 * 24; // 1d
        }

        if (timeframe != current) {
          this.timeframe = timeframe;

          return true;
        }

        return false;
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