import Exchange from '../services/exchange'

class Poloniex extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'poloniex'

    this.endpoints = {
      PRODUCTS: 'https://www.poloniex.com/public?command=returnTicker',
      TRADES: () => () =>
        `https://poloniex.com/public?command=returnTradeHistory&currencyPair=${this.pair}&start=${+new Date() / 1000 - 60 * 15}&end=${+new Date() /
          1000}`
    }

    this.options = Object.assign(
      {
        url: 'wss://api2.poloniex.com'
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
            command: 'subscribe',
            channel: this.pair
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
        .filter(result => result[0] === 't')
        .map(trade => ({
          exchange: this.id,
          timestamp: +new Date(trade[5] * 1000),
          price: +trade[3],
          size: +trade[4],
          side: trade[2] ? 'buy' : 'sell'
        }))
    }
  }

  formatProducts(data) {
    let output = {}

    Object.keys(data).forEach(a => {
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
