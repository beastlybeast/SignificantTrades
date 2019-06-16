import Exchange from '../services/exchange'

class Kraken extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'kraken'

    this.endpoints = {
      PRODUCTS: 'https://api.kraken.com/0/public/AssetPairs',
      TRADES: () => `https://api.kraken.com/0/public/Trades?pair=${this.pair}`,
    }

    this.options = Object.assign(
      {
        url: () => {
          return `wss://ws.kraken.com`
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
      this.api.send(
        JSON.stringify({
          event: 'subscribe',
          pair: [this.pair],
          subscription: {
            name: 'trade',
          },
        })
      )

      this.emitOpen(event)
    }
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
    if (json && json[1] && json[1].length) {
      return json[1].map((trade) => [
        this.id,
        trade[2] * 1000,
        trade[0],
        trade[1],
        trade[3] === 'b' ? 1 : 0,
      ])
    }

    return false
  }

  /* formatRecentsTrades(response) {
    if (response && response.length) {
      return response.reverse().map(trade => [
        this.id,
        +new Date(trade.timestamp),
        trade.price,
        trade.size / trade.price,
        trade.side === 'Buy' ? 1 : 0
      ])
    }
  } */

  matchPairName(name) {
    name = name.trim().replace('/', '')

    if (
      this.products.indexOf(name) !== -1 ||
      ((name = name.replace('BTC', 'XBT')) && this.products.indexOf(name) !== -1)
    ) {
      if (name.indexOf('/') === -1) {
        name =
          name.slice(0, name.length - 3) +
          '/' +
          name.slice(name.length - 3, name.length)
      }

      return name
    }

    return false
  }

  formatProducts(data) {
    return Object.keys(data.result).map((id) => data.result[id].altname)
  }
}

export default Kraken
