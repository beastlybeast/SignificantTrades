import Exchange from '../services/exchange'
import pako from 'pako'

class Huobi extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'huobi'

    this.endpoints = {
      PRODUCTS: 'http://api.huobi.pro/v1/common/symbols',
    }

    this.matchPairName = (pair) => {
      pair = pair.replace(/USD$/, 'USDT')

      if (this.products.indexOf(pair) !== -1) {
        return pair.toLowerCase()
      }

      return false
    }

    this.options = Object.assign(
      {
        url: 'wss://api.huobi.pro/ws',
      },
      this.options
    )
  }

  connect() {
    if (!super.connect()) return

    this.api = new WebSocket(this.getUrl())

    this.api.binaryType = 'arraybuffer'

    this.api.onmessage = (event) =>
      this.emitTrades(this.formatLiveTrades(event.data))

    this.api.onopen = (event) => {
      this.api.send(
        JSON.stringify({
          sub: 'market.' + this.pair + '.trade.detail',
          id: this.pair,
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

  formatLiveTrades(event) {
    const json = JSON.parse(pako.inflate(event, { to: 'string' }))

    if (!json) {
      return
    }

    if (json.ping) {
      this.api.send(JSON.stringify({ pong: json.ping }))
      return
    } else if (json.tick && json.tick.data && json.tick.data.length) {
      return json.tick.data.map((trade) => [
        this.id,
        trade.ts,
        +trade.price,
        +trade.amount,
        trade.direction === 'buy' ? 1 : 0,
      ])
    }
  }

  formatProducts(response) {
    return Object.keys(response.data).map((a) =>
      (
        response.data[a]['base-currency'] + response.data[a]['quote-currency']
      ).toUpperCase()
    )
  }
}

export default Huobi
