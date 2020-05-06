import Exchange from '../services/exchange'

class Bitstamp extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'bitstamp'

    this.endpoints = {
      PRODUCTS: 'https://www.bitstamp.net/api/v2/trading-pairs-info/',
      TRADES: () => `https://www.bitstamp.net/api/v2/transactions/${this.pair}`
    }

    this.matchPairName = pair => {
      if (this.products.indexOf(pair) !== -1) {
        return pair.toLowerCase()
      }

      return false
    }

    this.options = Object.assign(
      {
        url: () => {
          return `wss://ws.bitstamp.net`
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
        for (let pair of this.pairs) {
          this.api.send(
            JSON.stringify({
              event: 'bts:subscribe',
              data: {
                channel: 'live_trades_' + pair
              }
            })
          )
        }

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

  formatLiveTrades(event) {
    const trade = event.data

    if (!trade || !trade.amount) {
      return
    }

    return [
      {
        exchange: this.id,
        timestamp: +new Date(trade.microtimestamp / 1000),
        price: trade.price,
        size: trade.amount,
        side: trade.type === 0 ? 'buy' : 'sell'
      }
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
    return data.map(a => a.name.replace('/', ''))
  }
}

export default Bitstamp
