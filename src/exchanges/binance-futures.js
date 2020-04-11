import Exchange from '../services/exchange'

class BinanceFutures extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'binance_futures'

    this.endpoints = {
      PRODUCTS: 'https://fapi.binance.com/fapi/v1/exchangeInfo'
    }

    this.matchPairName = pair => {
      if (this.products.indexOf(pair) !== -1) {
        return pair.toLowerCase()
      }

      pair = pair.replace(/USD$/, 'USDT')

      if (this.products.indexOf(pair) !== -1) {
        return pair.toLowerCase()
      }

      return false
    }

    this.options = Object.assign(
      {
        url: () => {
          return `wss://fstream.binance.com/stream?streams=${this.pairs.map(pair => `${pair}@aggTrade/${pair}@forceOrder`).join('/')}`
        }
      },
      this.options
    )
  }

  connect() {
    if (!super.connect()) return

    this.api = new WebSocket(this.getUrl())

    this.api.onmessage = event => this.queueTrades(this.formatLiveTrades(JSON.parse(event.data)))

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

  formatLiveTrades(json) {
    if (json && json.data) {
      if (json.data.e === 'aggTrade') {
        return [
          {
            exchange: this.id,
            timestamp: json.data.T,
            price: +json.data.p,
            size: +json.data.q,
            side: json.data.m ? 'sell' : 'buy'
          }
        ]
      } else if (json.data.e === 'forceOrder') {
        return [
          {
            exchange: this.id,
            timestamp: json.data.o.T,
            price: +json.data.o.p,
            size: +json.data.o.q,
            side: json.data.o.S === 'BUY' ? 'buy' : 'sell',
            liquidation: true
          }
        ]
      }
    }

    return false
  }

  formatProducts(data) {
    return data.symbols.map(a => a.symbol)
  }
}

export default BinanceFutures
