import Exchange from '../services/exchange'

class Binance extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'binance'

    this.endpoints = {
      PRODUCTS: 'https://api.binance.com/api/v1/ticker/allPrices',
      TRADES: () =>
        `https://api.binance.com/api/v1/trades?symbol=${this.pair.toUpperCase()}`,
    }

    this.matchPairName = (pair) => {
      pair = pair.replace(/USD$/, 'USDT')

      if (this.products.indexOf(pair) !== -1) {
        return pair.toLowerCase()
      }

      return false
    }

    this.options = Object.assign(
      {
        url: () => {
          return 'wss://stream.binance.com:9443/ws/' + this.pair + '@aggTrade'
        },
      },
      this.options
    )
  }

  connect() {
    if (!super.connect()) return

    this.api = new WebSocket(this.getUrl())

    this.api.onmessage = (event) =>
      this.emitTrades(this.formatLiveTrades(JSON.parse(event.data)))

    this.api.onopen = this.emitOpen.bind(this)

    this.api.onclose = this.emitClose.bind(this)

    this.api.onerror = this.emitError.bind(this, { message: 'Websocket error' })
  }

  disconnect() {
    if (!super.disconnect()) return

    if (this.api && this.api.readyState < 2) {
      this.api.close()
    }
  }

  formatLiveTrades(trade) {
    if (trade) {
      return [[this.id, trade.E, +trade.p, +trade.q, trade.m ? 0 : 1]]
    }

    return false
  }

  /* formatRecentsTrades(data) {
    return data.map(trade => [
      this.id,
      trade.time,
      trade.price,
      trade.qty,
      !trade.isBuyerMaker ? 1 : 0
    ])
  } */

  formatProducts(data) {
    return data.map((a) => a.symbol)
  }
}

export default Binance
