<template>
  <div>
    <div id="chart"></div>
    <button @click="load">load</button>
  </div>
</template>

<script>
  import Highcharts from 'highcharts';
  import socket from '../socket';
  import moment from 'moment';

  const data = {
    name: 'Tokyo',
    marker: {
      symbol: 'square'
    },
    data: [7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 25.2, {
      y: 26.5,
      marker: {
        symbol: 'url(http://www.highcharts.com/demo/gfx/sun.png)'
      }
    }, 23.3, 18.3, 13.9, 9.6]
  }

  socket.$on('message', event => {
    console.log(this);
  })

  let cursor = 6690;
  let timestamp = +new Date();
  const prices = [];
  const buys = [];
  const sell = [];
  for (let i=0; i<50; i++) {
    cursor += (Math.random() * 10) - 10;
    timestamp = timestamp + (i * Math.random() * 100);
    prices.push([timestamp, cursor]);
    buys.push([timestamp, Math.random() * 20]);
    sell.push([timestamp, Math.random() * 20]);
  }

  export default {
    data() {
      return {
        chart: null,
        options: {
          chart: {
            renderTo: 'chart',
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
            line: {
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
            data: prices,
            color: '#222',
            dashStyle: 'ShortDash',
            stacking: 'stream',
            animation: false,
            lineWidth: 2,
          },{
            name: 'SELL',
            stacking: 'area',
            type: 'area',
            data: sell,
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
            data: buys,
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
    mounted() {
      this.chart = Highcharts.chart(this.options);
    },
    methods: {
      load() {
        this.chart.addSeries(data);
        this.chart.hideLoading();
      }
    }
  }
</script>