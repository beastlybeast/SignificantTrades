import Exchange from '../services/exchange'

class Hitbtc extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'hitbtc'

    this.endpoints = {
      PRODUCTS: 'https://api.hitbtc.com/api/2/public/symbol',
      TRADES: () =>
        `https://api.hitbtc.com/api/2/public/trades/${
          this.pair
        }?sort=DESC&limit=500`,
    }

    this.options = Object.assign(
      {
        url: 'wss://api.hitbtc.com/api/2/ws',
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
      this.api.send(
        JSON.stringify({
          method: 'subscribeTrades',
          params: {
            symbol: this.pair,
          },
        })
      )

      this.emitOpen(event)
    }

    this.api.onclose = this.emitClose.bind(this)

    this.api.onerror = this.emitError.bind(this, { message: 'Websocket error' })
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

    if (
      json.method === 'updateTrades' &&
      json.params &&
      json.params.data &&
      json.params.data.length
    ) {
      return json.params.data.map((trade) => [
        this.id,
        +new Date(trade.timestamp),
        +trade.price,
        +trade.quantity,
        trade.side === 'buy' ? 1 : 0,
      ])
    }
  }

  /* formatRecentsTrades(response) {
    if (response && response.length) {
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
    return data.map((a) => a.id)
  }
}

export default Hitbtc
