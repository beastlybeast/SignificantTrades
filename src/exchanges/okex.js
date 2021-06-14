import Exchange from '../services/exchange'
import pako from 'pako'

class Okex extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'okex'
    this.types = []

    this.tradeStack = []
    this.dispatchTradesTimeout = null

    this.endpoints = {
      PRODUCTS: [
        'https://www.okex.com/api/spot/v3/instruments',
        'https://www.okex.com/api/swap/v3/instruments',
        'https://www.okex.com/api/futures/v3/instruments'
      ],
      TRADES: () => `https://www.okex.com/api/v1/trades.do?symbol=${this.pair}`
    }

    // 2019-11-06
    // retro compatibility for client without contract specification stored
    // -> force refresh of stored instruments / specs
    if (this.products && typeof this.specs === 'undefined') {
      delete this.products
    }

    this.matchPairName = pair => {
      let id = this.products[pair] || this.products[pair.replace(/USDT/i, 'USD')]

      if (!id) {
        for (let name in this.products) {
          if (pair === this.products[name]) {
            id = this.products[name]
            break
          }
        }
      }

      if (id) {
        if (/\d+$/.test(id)) {
          this.types[id] = 'futures'
        } else if (/-SWAP$/.test(id)) {
          this.types[id] = 'swap'
        } else {
          this.types[id] = 'spot'
        }
      }

      return id || false
    }

    this.options = Object.assign(
      {
        url: 'wss://real.okex.com:8443/ws/v3'
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

      this.api.binaryType = 'arraybuffer'

      this.api.onmessage = event => this.queueTrades(this.formatLiveTrades(event.data))

      this.api.onopen = e => {
        this.api.send(
          JSON.stringify({
            op: 'subscribe',
            args: this.pairs.map(pair => `${this.types[pair]}/trade:${pair}`)
          })
        )

        this.keepalive = setInterval(() => {
          this.api.send('ping')
        }, 30000)

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

    clearInterval(this.keepalive)

    if (this.api && this.api.readyState < 2) {
      this.api.close()
    }
  }

  formatLiveTrades(event) {
    let json

    try {
      if (event instanceof String) {
        json = JSON.parse(event)
      } else {
        json = JSON.parse(pako.inflateRaw(event, { to: 'string' }))
      }
    } catch (error) {
      return
    }

    if (!json || !json.data || !json.data.length) {
      return
    }

    return json.data.map(trade => {
      let size

      if (typeof this.specs[trade.instrument_id] !== 'undefined') {
        size = ((trade.size || trade.qty) * this.specs[trade.instrument_id]) / trade.price
      } else {
        size = trade.size
      }

      return {
        exchange: this.id,
        timestamp: +new Date(trade.timestamp),
        price: +trade.price,
        size: +size,
        side: trade.side
      }
    })
  }

  /* formatRecentsTrades(response) {
    if (response && response.length) {
      return response.map(trade => [
        this.id,
        trade.date_ms,
        trade.price,
        trade.amount,
        trade.type === 'buy' ? 1 : 0,
      ]);
    }
  } */

  formatProducts(response) {
    const products = {}
    const specs = {}

    const types = ['spot', 'swap', 'futures']

    response.forEach((data, index) => {
      data.forEach(product => {
        const pair = (
          (product.base_currency ? product.base_currency : product.underlying_index) +
          (types[index] === 'spot' ? product.quote_currency.replace(/usdt$/i, 'USD') : product.quote_currency)
        ).toUpperCase() // base+quote ex: BTCUSD

        switch (types[index]) {
          case 'spot':
            products[pair] = product.instrument_id
            break
          case 'swap':
            products[pair + '-SWAP'] = product.instrument_id
            specs[product.instrument_id] = +product.contract_val
            break
          case 'futures':
            products[pair + '-' + product.alias.toUpperCase()] = product.instrument_id
            specs[product.instrument_id] = +product.contract_val
            break
        }
      })
    })

    return {
      products,
      specs
    }
  }

  pad(num, size) {
    var s = '000000000' + num
    return s.substr(s.length - size)
  }
}

export default Okex
