import Exchange from '../services/exchange'

class Gdax extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'gdax'

    this.endpoints = {
      PRODUCTS: 'https://api.pro.coinbase.com/products',
      TRADES: () => `https://api.pro.coinbase.com/products/${this.pair}/trades`
    }

    this.matchPairName = pair => {
      pair = pair.substr(0, 3) + '-' + pair.substr(3, pair.length)

      if (this.products.indexOf(pair) !== -1) {
        return pair
      }

      return false
    }

    this.options = Object.assign(
      {
        url: 'wss://ws-feed.pro.coinbase.com'
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
            type: 'subscribe',
            channels: [{ name: 'matches', product_ids: [this.pair] }]
          })
        )

        this.emitOpen(e)

        resolve()
      }

      this.api.onclose = this.emitClose.bind(this)
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
    if (json && json.size > 0) {
      this.queueTrades([
        {
          exchange: this.id,
          timestamp: +new Date(json.time),
          price: +json.price,
          size: +json.size,
          side: json.side === 'buy' ? 'sell' : 'buy'
        }
      ])
    }
  }

  formatProducts(data) {
    return data.map(a => a.id)
  }

  /* formatRecentsTrades(response) {
        if (response && response.length) {
            return response.map(trade => [
                this.id,
                +new Date(trade.time),
                +trade.price,
                +trade.size,
                trade.side === 'buy' ? 0 : 1,
            ])
        }
    } */
}

export default Gdax
