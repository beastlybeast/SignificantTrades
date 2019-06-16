import Exchange from '../services/exchange'
import Pusher from 'pusher-js'

class Liquid extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'liquid'

    this.endpoints = {
      PRODUCTS: 'https://api.liquid.com/products',
    }

    this.matchPairName = (pair) => {
      if (this.products.indexOf(pair) !== -1) {
        return pair.toLowerCase()
      }

      return false
    }

    this.options = Object.assign(
      {
        appId: '2ff981bb060680b5ce97',
        channel: 'executions_cash_',
        bind: 'created',
      },
      this.options
    )
  }

  connect() {
    if (!super.connect()) return

    this.api = new Pusher(this.options.appId)

    const channel = this.api.subscribe(
      this.options.channel + this.pair.toLowerCase()
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
        +new Date(trade.created_at * 1000),
        trade.price,
        trade.quantity,
        trade.taker_side === 'buy' ? 1 : 0,
      ],
    ]
  }

  formatProducts(data) {
    return data.map((a) => a.currency_pair_code)
  }
}

export default Liquid
