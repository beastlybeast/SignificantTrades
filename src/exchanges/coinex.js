import Exchange from '../services/exchange'

class Coinex extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'coinex'

    this.endpoints = {
      PRODUCTS: 'https://api.coinex.com/v1/market/list',
      TRADES: () =>
        `https://api.coinex.com/v1/market/deals?market=${this.pair}`,
    }

    this.matchPairName = (pair) => {
      pair = pair.replace(/USD$/, 'USDT')

      if (this.products.indexOf(pair) !== -1) {
        return pair
      }

      return false
    }

    this.options = Object.assign(
      {
        url: () => {
          return `wss://socket.coinex.com/`
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

    this.api.onopen = (event) => {
      this.skip = true

      this.api.send(
        JSON.stringify({
          method: 'deals.subscribe',
          params: [this.pair],
          id: 16,
        })
      )

      this.keepalive = setInterval(() => {
        this.api.send(
          JSON.stringify({
            method: 'server.ping',
            params: [],
            id: 11,
          })
        )
      }, 30000)

      this.emitOpen(event)
    }

    this.api.onclose = (event) => {
      this.emitClose(event)

      clearInterval(this.keepalive)
    }

    this.api.onerror = this.emitError.bind(this, { message: 'Websocket error' })
  }

  disconnect() {
    if (!super.disconnect()) return

    if (this.api && this.api.readyState < 2) {
      this.api.close()
    }
  }

  formatLiveTrades(json) {
    if (
      json.method === 'deals.update' &&
      json.params &&
      json.params.length &&
      json.params[0] === this.pair
    ) {
      if (this.skip) {
        this.skip = false
        return false
      }

      return json.params[1].map((trade) => {
        return [
          this.id,
          trade.time * 1000,
          +trade.price,
          +trade.amount,
          trade.type === 'buy' ? 1 : 0,
        ]
      })
    }

    return false
  }

  /* formatRecentsTrades(response) {
    if (response && response.data && response.data.length) {
      return response.data.map(trade => [
        this.id,
        +trade.date_ms,
        +trade.price,
        +trade.amount,
        trade.type === 'buy' ? 1 : 0
      ])
    }
  } */

  formatProducts(response) {
    if (!response || !response.data || !response.data.length) {
      return null
    }

    return response.data
  }
}

export default Coinex
