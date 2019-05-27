import Exchange from '../services/exchange'
import pako from 'pako'

class Okex extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'okex'

    this.endpoints = {
      PRODUCTS: [
        'https://www.okex.com/api/v1/tickers.do',
        'POST|https://www.okex.com/v2/futures/pc/market/futuresCoin.do',
      ],
      TRADES: () => `https://www.okex.com/api/v1/trades.do?symbol=${this.pair}`,
    }

    this.matchPairName = (pair) => {
      if (this.pairs.spots[pair]) {
        this.type = 'spot'
        return this.pairs.spots[pair]
      } else if (this.pairs.futures[pair]) {
        this.type = 'futures'
        return this.pairs.futures[pair]
      }

      return false
    }

    this.options = Object.assign(
      {
        url: () => {
          if (this.type === 'futures') {
            return 'wss://real.okex.com:10440/websocket/okexapi'
          } else {
            return 'wss://real.okex.com:10441/websocket'
          }
        },
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
      const channel =
        this.type === 'futures'
          ? 'ok_sub_futureusd_' + this.pair
          : 'ok_sub_spot_' + this.pair + '_deals'

      this.api.send(
        JSON.stringify({
          event: 'addChannel',
          channel: channel,
        })
      )

      this.keepalive = setInterval(() => {
        this.api.send(JSON.stringify({ event: 'ping' }))
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

      delete this.reference
    }
  }

  formatLiveTrades(event) {
    const initial = typeof this.reference === 'undefined'

    let json

    try {
      if (event instanceof String) {
        json = JSON.parse(event)
      } else {
        json = JSON.parse(pako.inflateRaw(event, { to: 'string' }))
      }
    } catch (error) {
      console.error(`[okex] failed to parse event data`, error)
      return
    }

    if (!json || !json[0] || json[0].channel === 'addChannel') {
      return
    }

    const base = new Date()
    base.setTime(
      base.getTime() + (8 + base.getTimezoneOffset() / 60) * 60 * 60 * 1000
    )

    const output = json[0].data.map((trade, index, array) => {
      const timestamp = +new Date(
        `${base.getFullYear()}-${this.pad(base.getMonth() + 1, 2)}-${this.pad(
          base.getDate(),
          2
        )}T${trade[3]}+08:00`
      )

      if (index === array.length - 1) {
        this.reference = timestamp
      }

      return [
        this.id,
        timestamp,
        +trade[1],
        this.type === 'futures' ? (trade[2] / trade[1]) * 100 : +trade[2],
        trade[4] === 'bid' ? 1 : 0,
      ]
    })

    if (!initial) {
      return output
    }
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
    const output = {
      futures: {},
      spots: {},
    }

    const futuresContractsTypes = ['this_week', 'next_week', 'quarter']

    response.forEach((data) => {
      if (data && data.tickers && data.tickers.length) {
        data.tickers.forEach((product) => {
          output.spots[
            product.symbol
              .split('_')
              .join('')
              .replace(/usdt$/, 'USD')
              .toUpperCase()
          ] = product.symbol
        })
      } else if (data && data.msg === 'success' && data.data) {
        data.data.forEach((product) => {
          product.contracts.forEach((contract, index) => {
            output.futures[contract.desc] =
              product.symbolDesc.toLowerCase() +
              '_trade_' +
              futuresContractsTypes[index]
          })
        })
      }
    })

    return Object.keys(output.spots).length || Object.keys(output.spots).length
      ? output
      : []
  }

  pad(num, size) {
    var s = '000000000' + num
    return s.substr(s.length - size)
  }
}

export default Okex
