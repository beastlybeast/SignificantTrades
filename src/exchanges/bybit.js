import Exchange from '../services/exchange'

class Bybit extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'bybit'

    this.products = ['BTCUSD', 'ETHUSD', 'EOSUSD', 'XRPUSD']

    this.endpoints = {
      // PRODUCTS: 'not available yet'
    }

    this.options = Object.assign(
      {
        url: () => {
          return `wss://stream.bybit.com/realtime`
        }
      },
      this.options
    )
  }

  connect() {
    if (!super.connect()) return

    this.api = new WebSocket(this.getUrl())

    this.api.onmessage = event => this.queueTrades(this.formatLiveTrades(JSON.parse(event.data)))

    this.api.onopen = event => {
      this.skip = true

      this.api.send(
        JSON.stringify({
          op: 'subscribe',
          args: ['trade']
        })
      )

      /* this.keepalive = setInterval(() => {
                this.api.send(JSON.stringify({
                    op: 'ping',
                }));
            }, 60000); */

      this.emitOpen(event)
    }

    this.api.onclose = event => {
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
    if (!json.data || json.topic !== 'trade.' + this.pair || !json.data.length) {
      return
    }

    return json.data.map(trade => {
      return {
        exchange: this.id,
        timestamp: +new Date(trade.timestamp),
        price: +trade.price,
        size: trade.size / trade.price,
        side: trade.side === 'Buy' ? 'buy' : 'sell'
      }
    })
  }

  formatProducts(data) {
    return data.result.reduce((output, product) => {
      output[product.settlement === 'perpetual' ? product.baseCurrency + product.currency : product.instrumentName] = product.instrumentName
      return output
    }, {})
  }
}

export default Bybit
