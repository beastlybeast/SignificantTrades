import Exchange from '../services/exchange'

class Deribit extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'deribit'

    this.endpoints = {
      PRODUCTS: 'https://www.deribit.com/api/v1/public/getinstruments'
    }

    this.options = Object.assign(
      {
        url: () => {
          return `wss://www.deribit.com/ws/api/v2`
        }
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
        this.skip = true

        this.api.send(
          JSON.stringify({
            method: 'public/subscribe',
            params: {
              channels: ['trades.' + this.pair + '.raw']
            }
          })
        )

        this.keepalive = setInterval(() => {
          this.api.send(
            JSON.stringify({
              method: 'public/ping'
            })
          )
        }, 60000)

        this.emitOpen(e)

        resolve()
      }

      this.api.onclose = event => {
        this.emitClose(event)

        clearInterval(this.keepalive)
      }
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
    if (!json.params || !json.params.data || !json.params.data.length) {
      return
    }

    return json.params.data.map(a => {
      const trade = {
        exchange: this.id,
        timestamp: +a.timestamp,
        price: +a.price,
        size: a.amount / a.price,
        side: a.direction
      }

      if (a.liquidation) {
        trade.liquidation = true
      }

      return trade
    })
  }

  formatProducts(data) {
    return data.result.reduce((output, product) => {
      output[product.settlement === 'perpetual' ? product.baseCurrency + product.currency : product.instrumentName] = product.instrumentName
      return output
    }, {})
  }
}

export default Deribit
