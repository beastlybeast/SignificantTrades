process.env.VUE_APP_VERSION = require('./package.json').version

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
  }
}
