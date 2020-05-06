import Exchange from '../services/exchange'

class Binance extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'binance'

    this.endpoints = {
      PRODUCTS: 'https://api.binance.com/api/v1/ticker/allPrices',
      TRADES: () => `https://api.binance.com/api/v1/trades?symbol=${this.pair.toUpperCase()}`
    }

    this.matchPairName = pair => {
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
        }
      },
      this.options
    )

    this.initialize()
  }

  connect() {
    const validation = super.connect()
    if (!validation) return Promise.reject()
    else if (validation instanceof Promise) return validation

    return new Promise((resolve, reject) => {
      this.api = new WebSocket(this.getUrl())

      this.api.onmessage = event => this.queueTrades(this.formatLiveTrades(JSON.parse(event.data)))
      this.api.onopen = e => {
        this.emitOpen(e)

        resolve()
      }
      this.api.onclose = this.emitClose.bind(this)
      this.api.onerror = () => {
        this.emitError({ message: `${this.id} disconnected` })

        reject()
      }
    })
  }

  disconnect() {
    if (!super.disconnect()) return

    if (this.api && this.api.readyState < 2) {
      this.api.close()
    }
  }

  formatLiveTrades(trade) {
    if (trade) {
      return [
        {
          exchange: this.id,
          timestamp: trade.E,
          price: +trade.p,
          size: +trade.q,
          side: trade.m ? 'sell' : 'buy'
        }
      ]
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
    return data.map(a => a.symbol)
  }
}

export default Binance
