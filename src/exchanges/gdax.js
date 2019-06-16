import Exchange from '../services/exchange'

class Gdax extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'gdax'

    this.endpoints = {
      PRODUCTS: 'https://api.pro.coinbase.com/products',
      TRADES: () => `https://api.pro.coinbase.com/products/${this.pair}/trades`,
    }

    this.matchPairName = (pair) => {
      pair = pair.substr(0, 3) + '-' + pair.substr(3, pair.length)

      if (this.products.indexOf(pair) !== -1) {
        return pair
      }

      return false
    }

    this.options = Object.assign(
      {
        url: 'wss://ws-feed.pro.coinbase.com',
      },
      this.options
    )
  }

  connect() {
    if (!super.connect()) return

    this.api = new WebSocket(this.getUrl())
    this.api.onmessage = (event) => {
      if (!event) {
        return
      }

      let obj = JSON.parse(event.data)

      if (obj && obj.size > 0) {
        this.emitTrades([
          [
            this.id,
            +new Date(obj.time),
            +obj.price,
            +obj.size,
            obj.side === 'buy' ? 0 : 1,
          ],
        ])
      }
    }

    this.api.onopen = (event) => {
      this.api.send(
        JSON.stringify({
          type: 'subscribe',
          channels: [{ name: 'matches', product_ids: [this.pair] }],
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

  formatProducts(data) {
    return data.map((a) => a.id)
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
