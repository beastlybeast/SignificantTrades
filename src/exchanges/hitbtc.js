import Exchange from '../services/exchange'

class Hitbtc extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'hitbtc'

    this.endpoints = {
      PRODUCTS: 'https://api.hitbtc.com/api/2/public/symbol',
      TRADES: () => `https://api.hitbtc.com/api/2/public/trades/${this.pair}?sort=DESC&limit=500`
    }

    this.options = Object.assign(
      {
        url: 'wss://api.hitbtc.com/api/2/ws'
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
            method: 'subscribeTrades',
            params: {
              symbol: this.pair
            }
          })
        )

        resolve()

        this.emitOpen(e)
      }

      this.api.onclose = this.emitClose.bind(this)
      this.api.onerror = () => {
        this.emitError({ message: `${this.id} disconnected` })

        reject()
      }
    })
  }

  disconnect() {
    if (!super.disconnect()) {
      return
    }

    if (this.api && this.api.readyState < 2) {
      this.api.close()
    }
  }

  formatLiveTrades(json) {
    if (!json) {
      return
    }

    if (json.method === 'updateTrades' && json.params && json.params.data && json.params.data.length) {
      return json.params.data.map(trade => ({
        exchange: this.id,
        timestamp: +new Date(trade.timestamp),
        price: +trade.price,
        size: +trade.quantity,
        side: trade.side
      }))
    }
  }

  /* formatRecentsTrades(response) {
    if (response && response.length) {
      return response.map(trade => [
        this.id,
        +new Date(trade.timestamp),
        +trade.price,
        +trade.quantity,
        trade.side === 'buy' ? 1 : 0
      ]);
    }
  } */

  formatProducts(data) {
    return data.map(a => a.id)
  }
}

export default Hitbtc
