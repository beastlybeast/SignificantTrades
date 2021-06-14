var date = new Date()

process.env.VUE_APP_VERSION = require('./package.json').version
process.env.VUE_APP_BUILD_DATE = date.getDate() + ' ' + date.toLocaleString('en-US', { month: 'short' }).toLowerCase()
process.env.VUE_APP_PROXY_URL = process.env.PROXY_URL
process.env.VUE_APP_API_URL = process.env.API_URL
process.env.VUE_APP_API_SUPPORTED_PAIRS = process.env.API_SUPPORTED_PAIRS

module.exports = {
  devServer: {
    // progress: true,
    hot: true,
    inline: true,
    // https: true,
    // port: 8081,
    historyApiFallback: true,
    proxy: [
      'https://api.kraken.com',
      'https://api.binance.com',
      'https://api.bitfinex.com',
      'https://api.gdax.com',
      'https://api.pro.coinbase.com',
      'https://api.prime.coinbase.com',
      'https://www.bitstamp.net',
      'https://api.hitbtc.com',
      'https://www.poloniex.com',
      'https://www.okex.com',
      'https://api.huobi.pro',
      'https://www.bitmex.com',
      'https://api.coinex.com',
      'https://api.liquid.com',
      'https://www.deribit.com',
      'https://fapi.binance.com',
      'https://api.hbdm.com',
      'https://ftx.com'
    ].reduce((obj, domain) => {
      const reg = `${domain}`

      obj[reg] = {
        target: domain,
        secure: false,
        changeOrigin: true,
        pathRewrite: {
          [domain]: ''
        }
      }

      return obj
    }, {})
  },
  css: {
    loaderOptions: {
      sass: {
        prependData: `@import "@/assets/sass/variables.scss";`
      }
    }
  },
  pwa: {
    name: 'SignificantTrades',
    themeColor: '#43a047',
    msTileColor: '#43a047'
  }
}
