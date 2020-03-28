import Vue from 'vue'
import Axios from 'axios'

import Kraken from '../exchanges/kraken'
import Bitmex from '../exchanges/bitmex'
import Coinex from '../exchanges/coinex'
import Huobi from '../exchanges/huobi'
import Binance from '../exchanges/binance'
import BinanceFutures from '../exchanges/binance-futures'
import Bitfinex from '../exchanges/bitfinex'
import Bitstamp from '../exchanges/bitstamp'
import Gdax from '../exchanges/gdax'
import Hitbtc from '../exchanges/hitbtc'
import Okex from '../exchanges/okex'
import Poloniex from '../exchanges/poloniex'
import Liquid from '../exchanges/liquid'
import Deribit from '../exchanges/deribit'
import Bybit from '../exchanges/bybit'
import Ftx from '../exchanges/ftx'

import store from '../services/store'

const emitter = new Vue({
  data() {
    return {
      API_URL: null,
      API_SUPPORTED_PAIRS: null,
      PROXY_URL: null,

      exchanges: [
        new Bitmex(),
        new Bitfinex(),
        new Binance(),
        new BinanceFutures(),
        new Bitstamp(),
        new Gdax(),
        new Poloniex(),
        new Kraken(),
        new Okex(),
        new Deribit(),
        new Huobi(),
        new Hitbtc(),
        new Coinex(),
        new Liquid(),
        new Bybit(),
        new Ftx()
      ],
      timestamps: {},
      queue: [],

      _pair: null,
      _fetchedMax: false,
      _fetchedTime: 0,
      _fetchedBytes: 0,
      _firstCloses: {}
    }
  },
  computed: {
    pair() {
      return store.state.pair
    },
    timeframe() {
      return store.state.timeframe
    },
    exchangesSettings() {
      return store.state.exchanges
    },
    actives() {
      return store.state.actives
    },
    showChart() {
      return store.state.showChart
    },
    chartRange() {
      return store.state.chartRange
    },
    showCounters() {
      return store.state.showCounters
    },
    countersSteps() {
      return store.state.countersSteps
    },
    isLoading() {
      return store.state.isLoading
    }
  },
  created() {
    window.emitTrade = (exchange, price, amount = 1, side = 1, type = null) => {
      exchange = exchange || 'bitmex'

      if (price === null) {
        price = this.getExchangeById(exchange).price
      }

      let trade = [exchange, +new Date(), price, amount, side ? 1 : 0, type]

      this.queue = this.queue.concat([trade])

      this.emitTrades([trade])
    }

    this.exchanges.forEach(exchange => {
      exchange.on('live_trades', trades => {
        if (!trades || !trades.length) {
          return
        }

        this.timestamps[exchange.id] = trades[0][1]

        trades = trades.sort((a, b) => a[1] - b[1])

        Array.prototype.push.apply(this.queue, trades)
        this.emitTrades(trades)
      })

      exchange.on('open', event => {
        console.log(`[socket.exchange.on.open] ${exchange.id} opened`)

        this.$emit('connected', exchange.id)
      })

      exchange.on('close', event => {
        console.log(`[socket.exchange.on.close] ${exchange.id} closed`)

        this.$emit('disconnected', exchange.id)

        if (exchange.shouldBeConnected && !this.exchangesSettings[exchange.id].disabled) {
          exchange.reconnect(this.pair)
        }
      })

      exchange.on('match', pair => {
        console.log(`[socket.exchange.on.match] ${exchange.id} matched ${pair}`)
        store.commit('setExchangeMatch', {
          exchange: exchange.id,
          match: pair
        })
      })

      exchange.on('error', event => {
        console.log(`[socket.exchange.on.error] ${exchange.id} reported an error`)
      })

      store.commit('reloadExchangeState', exchange.id)
    })
  },
  methods: {
    initialize() {
      console.log(`[sockets] initializing ${this.exchanges.length} exchange(s)`)

      if (process.env.API_URL) {
        this.API_URL = process.env.API_URL
        console.info(`[sockets] API_URL = ${this.API_URL}`)

        if (process.env.API_SUPPORTED_PAIRS) {
          this.API_SUPPORTED_PAIRS = process.env.API_SUPPORTED_PAIRS.map(a => a.toUpperCase())
          console.info(`[sockets] API_SUPPORTED_PAIRS = ${this.API_SUPPORTED_PAIRS}`)
        }
      }

      if (process.env.PROXY_URL) {
        this.PROXY_URL = process.env.PROXY_URL
        console.info(`[sockets] PROXY_URL = ${this.PROXY_URL}`)
      }

      setTimeout(this.connectExchanges.bind(this))

      setInterval(this.emitTradesAsync.bind(this), 50)
    },
    connectExchanges(pair = null) {
      this.disconnectExchanges()

      if (!pair && !this.pair) {
        return this.$emit('alert', {
          id: `server_status`,
          type: 'error',
          title: `No pair`,
          message: `Type the name of the pair you want to watch in the pair section of the settings panel`
        })
      }

      if (pair) {
        this.pair = pair.toUpperCase()
      }

      this.queue = []
      this.timestamps = {}
      this._fetchedMax = false

      console.log(`[socket.connect] connecting to ${this.pair}`)

      this.$emit('alert', {
        id: `server_status`,
        type: 'info',
        title: `Loading`,
        message: `Fetching products...`
      })

      Promise.all(this.exchanges.map(exchange => exchange.validatePair(this.pair))).then(() => {
        let validExchanges = this.exchanges.filter(exchange => exchange.valid)

        if (!validExchanges.length) {
          this.$emit('alert', {
            id: `server_status`,
            type: 'error',
            title: `No match`,
            message: `"${pair}" did not matched with any active pairs`
          })

          return
        }

        this.$emit('alert', {
          id: `server_status`,
          type: 'info',
          title: `Loading`,
          message: `${validExchanges.length} exchange(s) matched ${pair}`
        })

        if (this._pair !== this.pair) {
          this.$emit('pairing', this.pair, this.canFetch())

          this._pair = this.pair
        }

        console.log(`[socket.connect] ${validExchanges.length} successfully matched with ${this.pair}`)

        validExchanges = validExchanges.filter(exchange => !this.exchangesSettings[exchange.id].disabled)

        this.$emit('alert', {
          id: `server_status`,
          type: 'info',
          title: `Loading`,
          message: `Subscribing to ${this.pair} on ${validExchanges.length} exchange(s)`,
          delay: 1000 * 5
        })

        console.log(`[socket.connect] batch connect to ${validExchanges.map(a => a.id).join(' / ')}`)

        validExchanges.forEach(exchange => exchange.connect())
      })
    },
    disconnectExchanges() {
      console.log(`[socket.connect] disconnect exchanges asynchronously`)

      this.exchanges.forEach(exchange => exchange.disconnect())
    },
    getExchangeById(id) {
      for (let exchange of this.exchanges) {
        if (exchange.id === id) {
          return exchange
        }
      }

      return null
    },
    emitTrades(trades, event = 'trades.instant') {
      let upVolume = 0
      let downVolume = 0

      const output = trades.filter(a => {
        if (this.actives.indexOf(a[0]) === -1) {
          return false
        }

        if (a[4] > 0) {
          upVolume += a[3]
        } else {
          downVolume += a[3]
        }

        return true
      })

      this.$emit(event, output, upVolume, downVolume)
    },
    emitTradesAsync() {
      if (!this.queue.length) {
        return
      }

      this.emitTrades(this.queue, 'trades.queued')

      this.queue = []
    },
    canFetch() {
      return this.API_URL && (!this.API_SUPPORTED_PAIRS || this.API_SUPPORTED_PAIRS.indexOf(this.pair) !== -1)
    },
    getApiUrl(from, to) {
      let url = this.API_URL

      url = url.replace(/\{from\}/, from)
      url = url.replace(/\{to\}/, to)
      url = url.replace(/\{timeframe\}/, this.timeframe)
      url = url.replace(/\{pair\}/, this.pair.toLowerCase())
      url = url.replace(/\{exchanges\}/, this.actives.join('+'))

      return url
    },
    fetchHistoricalData(from, to) {
      const url = this.getApiUrl(from, to)

      if (this.lastFetchUrl === url) {
        return Promise.resolve()
      }

      this.lastFetchUrl = url

      store.commit('toggleLoading', true)

      this.$emit('fetchStart', to - from)

      return new Promise((resolve, reject) => {
        Axios.get(url, {
          onDownloadProgress: e => {
            this.$emit('loadingProgress', {
              loaded: e.loaded,
              total: e.total,
              progress: e.loaded / e.total
            })

            this._fetchedBytes += e.loaded
          }
        })
          .then(response => {
            if (!response.data || !response.data.results.length) {
              return resolve()
            }

            const format = response.data.format
            let data = response.data.results

            switch (response.data.format) {
              case 'downsampled':
                break
              default:
                data = data.map(a => {
                  a[1] = +a[1]
                  a[2] = +a[2]
                  a[3] = +a[3]
                  a[4] = +a[4]

                  return a
                })

                this.$emit('historical', data, from, to)

                resolve({
                  format: format,
                  data: data,
                  from: from,
                  to: to
                })
                break
            }
          })
          .catch(err => {
            this._fetchedMax = true

            err &&
              this.$emit('alert', {
                type: 'error',
                title: `Unable to retrieve history`,
                message: err.response && err.response.data && err.response.data.error ? err.response.data.error : err.message,
                id: `fetch_error`
              })

            reject()
          })
          .then(() => {
            this._fetchedTime += to - from

            this.$emit('fetchEnd', to - from)

            store.commit('toggleLoading', false)
          })
      })
    },
    downsampleTrades(trades) {
      const chunk = {
        data: null,
        from: Math.floor(trades[0][1] / this.timeframe) * this.timeframe,
        to: Math.floor(trades[trades.length - 1][1] / this.timeframe) * this.timeframe
      }

      const bars = []
      const bar = {
        timestamp: null,
        exchanges: {}
      }

      for (let i = 0; i <= trades.length; i++) {
        const trade = trades[i]
        const timestamp = trade && Math.floor(trade[1] / this.timeframe) * this.timeframe

        if (!timestamp || !bar.timestamp || timestamp > bar.timestamp) {
          // first trade of chunk (!bar.timestamp)
          // or is trade of next bar (timestamp > bar.timestamp)
          // or all trades processed (!timestamp)
          if (bar.timestamp) {
            for (let name in bar.exchanges) {
              bars.push(bar.exchanges[name])
            }
          }

          bar.exchanges = {}
        }

        if (!bar.exchanges[trade[0]]) {
          bar.exchanges[trade[0]] = {
            timestamp,
            open: trade[2],
            high: trade[2],
            low: trade[2],
            close: trade[2],
            vbuy: 0,
            vsell: 0,
            lbuy: 0,
            lsell: 0,
            cbuy: 0,
            csell: 0
          }
        }

        const sum = bar.exchanges[trade[0]]
        const side = trade[4] == 1 ? 'buy' : 'sell'

        if (trade[5] == 1) {
          sum['l' + side] += trade[2] * trade[3]
          continue
        }

        sum['v' + side] += trade[2] * trade[3]
        sum['c' + side]++

        sum.high = Math.max(sum.high, trade[2])
        sum.low = Math.min(sum.low, trade[2])
        sum.close = trade[2]
      }

      chunk.data = bars

      return chunk
    }
  }
})

export default emitter
