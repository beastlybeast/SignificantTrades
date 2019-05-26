import Exchange from '../services/exchange'

class Deribit extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'deribit'

    this.endpoints = {
      PRODUCTS: 'https://www.deribit.com/api/v1/public/getinstruments',
    }

    this.options = Object.assign(
      {
        url: () => {
          return `wss://www.deribit.com/ws/api/v2`
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
          method: 'public/subscribe',
          params: {
            channels: ['trades.' + this.pair + '.raw'],
          },
        })
      )

      this.keepalive = setInterval(() => {
        this.api.send(
          JSON.stringify({
            method: 'public/ping',
          })
        )
      }, 60000)

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
    if (!json.params || !json.params.data || !json.params.data.length) {
      return
    }

    return json.params.data.map((trade) => {
      return [
        this.id,
        +trade.timestamp,
        +trade.price,
        trade.amount / trade.price,
        trade.direction === 'buy' ? 1 : 0,
      ]
    })
  }

  formatProducts(data) {
    return data.result.reduce((output, product) => {
      output[
        product.settlement === 'perpetual'
          ? product.baseCurrency + product.currency
          : product.instrumentName
      ] = product.instrumentName
      return output
    }, {})
  }
}

export default Deribit
