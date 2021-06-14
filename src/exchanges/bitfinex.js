import Exchange from '../services/exchange'

class Bitfinex extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'bitfinex'

    this.endpoints = {
      PRODUCTS: 'https://api.bitfinex.com/v1/symbols',
      TRADES: () => `https://api.bitfinex.com/v2/trades/t${this.pair}/hist?limit=1000`
    }

    this.matchPairName = pair => {
      if (this.products.indexOf(pair) !== -1) {
        return pair
      }

      return false
    }

    this.options = Object.assign(
      {
        url: 'wss://api.bitfinex.com/ws/2'
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
        this.api.send(
          JSON.stringify({
            event: 'subscribe',
            channel: 'trades',
            symbol: 't' + this.pair
          })
        )

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

  formatLiveTrades(json) {
    if (!json || json[1] !== 'te') {
      return
    }

    return [
      {
        exchange: this.id,
        timestamp: +new Date(json[2][1]),
        price: +json[2][3],
        size: Math.abs(json[2][2]),
        side: json[2][2] < 0 ? 'sell' : 'buy'
      }
    ]
  }

  /* formatRecentsTrades(response) {
        if (!response || !response.length) {
            return;
        }

        return response.map(trade => [
            this.id,
            trade[1],
            trade[3],
            Math.abs(trade[2]),
            trade[2] > 0 ? 1 : 0,
        ]);
    } */

  formatProducts(data) {
    return data.map(a => a.toUpperCase())
  }
}

export default Bitfinex
