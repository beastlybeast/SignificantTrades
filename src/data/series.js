export default {
  price: {
    type: 'candlestick',
    input: `ohlc(bar)`,
    options: {
      upColor: '#c3a87a',
      downColor: '#e53935',
      borderUpColor: '#c3a87a',
      borderDownColor: '#e53935',
      wickUpColor: 'rgba(223, 195, 148, .8)',
      wickDownColor: 'rgba(224, 91, 95, .8)',
      priceLineColor: 'rgba(255, 255, 255, .5)',
      priceLineWidth: 1,
      priceLineStyle: 2,
      lastValueVisible: true,
      priceLineVisible: true,
      borderVisible: false,
      scaleMargins: {
        top: 0,
        bottom: 0
      }
    }
  },
  volume_sell_ema: {
    type: 'line',
    input: `ema(bar.vsell, options.ema_length)`,
    options: {
      ema_length: 14,
      scaleGroup: 'volume_ema',
      color: '#c14047',
      lineWidth: 2,
      overlay: true,
      scaleMargins: {
        top: 0.8,
        bottom: 0
      }
    }
  },
  volume_buy_ema: {
    type: 'line',
    input: `ema(bar.vbuy, options.ema_length)`,
    options: {
      ema_length: 14,
      scaleGroup: 'volume_ema',
      color: '#c9b087',
      lineWidth: 2,
      overlay: true,
      scaleMargins: {
        top: 0.8,
        bottom: 0
      }
    }
  },
  volume_delta: {
    type: 'histogram',
    input: `{
      value: Math.abs(bar.vbuy - bar.vsell),
      color: bar.vbuy - bar.vsell > 0 ? options.upColor : options.downColor
    }`,
    options: {
      upColor: '#c3a87a',
      downColor: '#e53935',
      scaleGroup: 'volume'
    }
  },
  volume: {
    type: 'histogram',
    input: `bar.vbuy + bar.vsell`,
    options: {
      color: 'rgba(255, 255, 255, .15)',
      scaleGroup: 'volume'
    }
  },
  liquidations: {
    type: 'histogram',
    input: `bar.lbuy + bar.lsell`,
    options: {
      scaleGroup: 'volume',
      color: '#9c27b0'
    }
  },
  cvd: {
    type: 'line',
    input: `bar.series.cvd.value + (bar.vbuy - bar.vsell)`,
    options: {
      color: '#c9b087',
      lineWidth: 2,
      overlay: true,
      scaleMargins: {
        top: 0.0,
        bottom: 0.7
      }
    }
  },
  price_sma: {
    type: 'line',
    input: `sma(bar.series.price.point.close, options.length)`,
    options: {
      color: 'rgba(52,100,69,0.38)',
      length: 29,
      lineWidth: 2
    }
  },
  price_cma: {
    type: 'line',
    input: `cma(bar.series.price.point.close, options.length)`,
    options: {
      length: 14,
      color: '#8c61f5',
      lineWidth: 2
    }
  }
}
