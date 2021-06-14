import Exchange from '../services/exchange'

class Bitmex extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'bitmex'

    this.endpoints = {
      PRODUCTS: 'https://www.bitmex.com/api/v1/instrument/active',
      TRADES: () => `https://www.bitmex.com/api/v1/trade?symbol=${this.pair}&reverse=true&count=500`
    }

    this.options = Object.assign(
      {
        url: () => {
          return `wss://www.bitmex.com/realtime?subscribe=${this.pairs.map(pair => `trade:${pair}`)},${this.pairs.map(pair => `liquidation:${pair}`)}`
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

      this.quotedInUSD = /USD$/.test(this.pair) || /^XBT/.test(this.pair)

      this.api.onmessage = event => this.queueTrades(this.formatLiveTrades(JSON.parse(event.data)))
      this.api.onopen = e => {
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

  /*queueTrades(trades) {
    if (!trades.length) {
      return
    }

    return this.emit('trades', trades)
  }*/

  formatLiveTrades(json) {
    if (json && json.data && json.data.length) {
      if (json.table === 'liquidation' && json.action === 'insert') {
        return json.data.map(trade => ({
          exchange: this.id,
          timestamp: +new Date(),
          price: trade.price,
          size: trade.leavesQty / (this.quotedInUSD ? trade.price : 1),
          side: trade.side === 'Buy' ? 'buy' : 'sell',
          liquidation: true
        }))
      } else if (json.table === 'trade' && json.action === 'insert') {
        return json.data.map(trade => ({
          exchange: this.id,
          timestamp: +new Date(trade.timestamp),
          price: trade.price,
          size: trade.size / (this.quotedInUSD ? trade.price : 1),
          side: trade.side === 'Buy' ? 'buy' : 'sell'
        }))
      }
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

  formatProducts(data) {
    return data.map(a => a.symbol)
  }

  matchPairName(name) {
    if (this.products.indexOf(name) !== -1) {
      return name
    } else if ((name = name.replace('BTC', 'XBT')) && this.products.indexOf(name) !== -1) {
      return name
    }

    return false
  }
}

export default Bitmex
