import Exchange from '../services/exchange'
import pako from 'pako'

class Okex extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'okex'

    this.endpoints = {
      PRODUCTS: [
        'https://www.okex.com/api/spot/v3/instruments',
        'https://www.okex.com/api/swap/v3/instruments',
        'https://www.okex.com/api/futures/v3/instruments',
      ],
      TRADES: () => `https://www.okex.com/api/v1/trades.do?symbol=${this.pair}`,
    }

    this.matchPairName = (pair) => {
      let id = this.products[pair] || this.products[pair.replace(/USDT/i, 'USD')];

      if (!id) {
        for (let name in this.products) {
          if (pair === this.products[name]) {
            id = this.products[name]
            break;
          }
        }
      }

      if (id) {
        if (/\d+$/.test(id)) {
          this.type = 'futures';
        } else if (/\-SWAP$/.test(id)) {
          this.type = 'swap';
        } else {
          this.type = 'spot';
        }
      }

      return id || false
    }

    this.options = Object.assign(
      {
        url: 'wss://real.okex.com:10442/ws/v3',
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
          op: 'subscribe',
          args: [`${this.type}/trade:${this.pair}`],
        })
      )

      this.keepalive = setInterval(() => {
        this.api.send('ping')
      }, 30000)

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
      let size;

      if (this.type === 'spot') {
        size = trade.size
      } else {
        size = (trade.size || trade.qty) * (/^BTC/.test(this.pair) ? 100 : 10) / trade.price
      }

      return [
        this.id,
        +new Date(trade.timestamp),
        +trade.price,
        size,
        trade.side === 'buy' ? 1 : 0,
      ]
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
    const output = {}

    const types = ['spot', 'swap', 'futures']

    response.forEach((data, index) => {
      data.forEach(product => {
        const pair = ((product.base_currency ? product.base_currency : product.underlying_index) + product.quote_currency.replace(/usdt$/i, 'USD')).toUpperCase() // base+quote ex: BTCUSD

        switch (types[index]) {
          case 'spot':
            output[pair] = product.instrument_id
          break
          case 'swap':
            output[pair + '-SWAP'] = product.instrument_id
          break
          case 'futures':
            output[pair + '-' + product.alias.toUpperCase()] = product.instrument_id
          break
        }
      })
    })

    return output
  }

  pad(num, size) {
    var s = '000000000' + num
    return s.substr(s.length - size)
  }
}

export default Okex
