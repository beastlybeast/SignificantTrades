import Exchange from '../services/exchange'

class Ftx extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'ftx'

    this.endpoints = {
      PRODUCTS: 'https://ftx.com/api/markets'
    }

    this.matchPairName = pair => {
      let id = this.products[pair]

      if (!id) {
        for (let name in this.products) {
          if (pair === this.products[name]) {
            id = this.products[name]
            break
          }
        }
      }

      /*if (id) {
        if (/\d+$/.test(id)) {
          this.types[id] = 'futures';
        } else if (/\-SWAP$/.test(id)) {
          this.types[id] = 'swap';
        } else {
          this.types[id] = 'spot';
        }
      }*/

      return id || false
    }

    this.options = Object.assign(
      {
        url: () => {
          return `wss://ftx.com/ws/`
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

        for (let pair of this.pairs) {
          this.api.send(JSON.stringify({ op: 'subscribe', channel: 'trades', market: pair }))
        }

        this.keepalive = setInterval(() => {
          this.api.send(
            JSON.stringify({
              op: 'ping'
            })
          )
        }, 15000)

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
    if (!json || !json.data || !json.data.length) {
      return
    }

    return json.data.map(trade => {
      const output = {
        exchange: this.id,
        timestamp: +new Date(trade.time),
        price: +trade.price,
        size: trade.size,
        side: trade.side
      }

      if (trade.liquidation) {
        output.liquidation = true
      }

      return output
    })
  }

  formatProducts(data) {
    return data.result.reduce((obj, product) => {
      let standardName = product.name
        .replace('/', 'SPOT')
        .replace(/-PERP$/g, '-USD')
        .replace(/[/-]/g, '')

      obj[standardName] = product.name

      return obj
    }, {})
  }
}

export default Ftx
