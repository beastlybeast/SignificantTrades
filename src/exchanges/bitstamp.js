import Exchange from '../services/exchange'
import Pusher from 'pusher-js'

class Bitstamp extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'bitstamp'

    this.endpoints = {
      PRODUCTS: 'https://www.bitstamp.net/api/v2/trading-pairs-info/',
      TRADES: () => `https://www.bitstamp.net/api/v2/transactions/${this.pair}`,
    }

    this.matchPairName = (pair) => {
      if (this.products.indexOf(pair) !== -1) {
        return pair.toLowerCase()
      }

      return false
    }

    this.options = Object.assign(
      {
        appId: 'de504dc5763aeef9ff52',
        channel: 'live_trades',
        bind: 'trade',
      },
      this.options
    )
  }

  connect() {
    if (!super.connect()) return

    this.api = new Pusher(this.options.appId)
    const channel = this.api.subscribe(
      this.options.channel + (this.pair === 'btcusd' ? '' : '_' + this.pair)
    )

    this.api.bind(this.options.bind, (trade) =>
      this.emitTrades(this.formatLiveTrades(trade))
    )

    this.api.connection.bind(
      'error',
      this.emitError.bind(this, { message: 'Websocket error' })
    )
    this.api.connection.bind('connected', this.emitOpen.bind(this))
    this.api.connection.bind('disconnected', this.emitClose.bind(this))
  }

  disconnect() {
    if (!super.disconnect()) return

    if (this.api && this.api.connection.state === 'connected') {
      this.api.disconnect()
    }
  }

  formatLiveTrades(trade) {
    return [
      [
        this.id,
        +new Date(trade.timestamp * 1000),
        trade.price,
        trade.amount,
        trade.type === 0 ? 1 : 0,
      ],
    ]
  }

  /* formatRecentsTrades(response) {
    if (response && response.length) {
      return response.map(trade => [
        this.id,
        trade.date * 1000,
        +trade.price,
        +trade.amount,
        trade.type === '1' ? 1 : 0
      ]);
    }
  } */

  formatProducts(data) {
    return data.map((a) => a.name.replace('/', ''))
  }
}

export default Bitstamp
