import Exchange from '../services/exchange'

class Poloniex extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'poloniex'

    this.endpoints = {
      PRODUCTS: 'https://poloniex.com/public?command=returnTicker',
      TRADES: () => () =>
        `https://poloniex.com/public?command=returnTradeHistory&currencyPair=${
          this.pair
        }&start=${+new Date() / 1000 - 60 * 15}&end=${+new Date() / 1000}`,
    }

    this.options = Object.assign(
      {
        url: 'wss://api2.poloniex.com',
      },
      this.options
    )
  }

  connect() {
    if (!super.connect()) return

    this.api = new WebSocket(this.getUrl())

    this.api.onmessage = (event) =>
      this.emitTrades(this.formatLiveTrades(JSON.parse(event.data)))

    this.api.onopen = (event) => {
      this.api.send(
        JSON.stringify({
          command: 'subscribe',
          channel: this.pair,
        })
      )

      this.emitOpen(event)
    }

    this.api.onclose = this.emitClose.bind(this)

    this.api.onerror = this.emitError.bind(this, { message: 'Websocket error' })
  }

  disconnect() {
    if (!super.disconnect()) {
      return
    }

    if (this.api && this.api.readyState < 2) {
      this.api.close()
    }
  }

  formatLiveTrades(json) {
    if (!json || json.length !== 3) {
      return
    }

    if (json[2] && json[2].length) {
      return json[2]
        .filter((result) => result[0] === 't')
        .map((trade) => [
          this.id,
          +new Date(trade[5] * 1000),
          +trade[3],
          +trade[4],
          trade[2],
        ])
    }
  }

  formatProducts(data) {
    let output = {}

    Object.keys(data).forEach((a) => {
      output[
        a
          .split('_')
          .reverse()
          .join('')
          .replace(/USDT$/, 'USD')
      ] = a
    })

    return output
  }

  /* formatRecentsTrades(response) {
    if (response && response.length) {
      return response.map(trade => [
        this.id,
        +new Date(trade.date.split(' ').join('T') + 'Z'),
        +trade.rate,
        +trade.amount,
        trade.type === 'buy' ? 1 : 0,
      ]);
    }
  } */
}

export default Poloniex
