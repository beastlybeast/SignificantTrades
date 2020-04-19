import Vue from 'vue'
import Axios from 'axios'

import Kraken from '../exchanges/kraken'
import Bitmex from '../exchanges/bitmex'
import Huobi from '../exchanges/huobi'
import Binance from '../exchanges/binance'
import BinanceFutures from '../exchanges/binance-futures'
import Bitfinex from '../exchanges/bitfinex'
import Bitstamp from '../exchanges/bitstamp'
import Gdax from '../exchanges/gdax'
import Hitbtc from '../exchanges/hitbtc'
import Okex from '../exchanges/okex'
import Poloniex from '../exchanges/poloniex'
import Deribit from '../exchanges/deribit'
import Bybit from '../exchanges/bybit'
import Ftx from '../exchanges/ftx'

import store from '../store'
import { MASTER_DOMAIN } from '../utils/helpers'

const QUEUE = {};
const REFS = {}

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
        new Bybit(),
        new Ftx()
      ],
      timestamps: {},

      _pair: null,
    }
  },
  computed: {
    pair() {
      return store.state.settings.pair
    },
    timeframe() {
      return store.state.settings.timeframe
    },
    exchangesSettings() {
      return store.state.settings.exchanges
    },
    showChart() {
      return store.state.settings.showChart
    },
    showSlippage() {
      return store.state.settings.showSlippage
    },
    chartRange() {
      return store.state.settings.chartRange
    },
    aggregateTrades() {
      return store.state.settings.aggregateTrades
    },
    actives() {
      return store.state.app.actives
    },
    isLoading() {
      return store.state.app.isLoading
    }
  },
  created() {
    this.exchanges.forEach(exchange => {
      exchange.on('trades', trades => {
        if (!trades || !trades.length) {
          return
        }

        this.timestamps[exchange.id] = trades[trades.length - 1].timestamp
        
        const length = trades.length;
        
        const sums = {

        }
        const aggrTrades = []

        for (let i = 0; i < length; i++) {
          const trade = trades[i];

          trade.ref = REFS[exchange.id] || trade.price;

          REFS[exchange.id] = trade.price;

          if (QUEUE[exchange.id]) {
            const queuedTrade = QUEUE[exchange.id]

            if (queuedTrade.timestamp === trade.timestamp && queuedTrade.side === trade.side) {
              queuedTrade.size += trade.size
              queuedTrade.price += trade.price * trade.size
              // queuedTrade.prices.push(trade.price)
              queuedTrade.high = Math.max(queuedTrade.high || queuedTrade.price / queuedTrade.size, trade.price)
              queuedTrade.low = Math.min(queuedTrade.low || queuedTrade.price / queuedTrade.size, trade.price)
              continue;
            } else {
              queuedTrade.price /= queuedTrade.size
              this.calculateSlippage(queuedTrade)
              aggrTrades.unshift(queuedTrade)
            }
          }
          
          QUEUE[exchange.id] = Object.assign({}, trade);
          QUEUE[exchange.id].high = Math.max(trade.ref, trade.price)
          QUEUE[exchange.id].low = Math.min(trade.ref, trade.price)
          QUEUE[exchange.id].price *= QUEUE[exchange.id].size
          
        }
        
        this.$emit('trades', trades)

        if (aggrTrades.length) {
          this.$emit('trades.aggr', aggrTrades)
        }
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
        store.commit('settings/SET_EXCHANGE_MATCH', {
          exchange: exchange.id,
          match: pair
        })
      })

      exchange.on('error', event => {
        console.log(`[socket.exchange.on.error] ${exchange.id} reported an error`)
      })

      store.dispatch('app/refreshExchange', exchange.id)
    })
  },
  methods: {
    getBarTrades(ts) {
      return TRADES && TRADES[ts];
    },
    initialize() {
      console.log(`[sockets] initializing ${this.exchanges.length} exchange(s)`)

      if (process.env.API_URL) {
        this.API_URL = process.env.API_URL
        !MASTER_DOMAIN && console.info(`[sockets] API_URL = ${this.API_URL}`)

        if (process.env.API_SUPPORTED_PAIRS) {
          this.API_SUPPORTED_PAIRS = process.env.API_SUPPORTED_PAIRS.map(a => a.toUpperCase())
          !MASTER_DOMAIN && console.info(`[sockets] API_SUPPORTED_PAIRS = ${this.API_SUPPORTED_PAIRS}`)
        }
      }

      if (process.env.PROXY_URL) {
        this.PROXY_URL = process.env.PROXY_URL
        !MASTER_DOMAIN && console.info(`[sockets] PROXY_URL = ${this.PROXY_URL}`)
      }

      setTimeout(this.connectExchanges.bind(this))

      setInterval(this.processQueue.bind(this), 50)
    },
    connectExchanges(pair = null) {
      this.disconnectExchanges()

      if (!pair && !this.pair) {
        store.dispatch('app/showNotice', {
          type: 'error',
          title: `No pair.`
        });
      }

      if (pair) {
        this.pair = pair.toUpperCase()
      }

      this.timestamps = {}
      this._fetchedMax = false

      console.log(`[socket.connect] connecting to ${this.pair}`)

      store.dispatch('app/showNotice', {
        type: 'info',
        title: 'Fetching the latest products, please wait.'
      });

      Promise.all(this.exchanges.map(exchange => exchange.validatePair(this.pair))).then(() => {
        let validExchanges = this.exchanges.filter(exchange => exchange.valid)

        if (!validExchanges.length) {
          store.dispatch('app/showNotice', {
            type: 'error',
            title: `Cannot find ${this.pair}, sorry`
          });

          return
        }

        if (this._pair !== this.pair) {
          this.$emit('pairing', this.pair, this.canFetch())

          this._pair = this.pair
        }

        const successfullMatches = validExchanges.length;

        console.log(`[socket.connect] ${successfullMatches} successfully matched with ${this.pair}`)

        validExchanges = validExchanges.filter(exchange => !this.exchangesSettings[exchange.id].disabled)

        store.dispatch('app/showNotice', {
          type: 'info',
          title: `Connecting to ${validExchanges.length} exchange${validExchanges.length > 1 ? 's' : ''}`
        });

        console.log(`[socket.connect] batch connect to ${validExchanges.map(a => a.id).join(' / ')}`)

        Promise.all(validExchanges.map(exchange => exchange.connect())).then(() => {
          store.dispatch('app/showNotice', {
            type: 'success',
            title: `Subscribed to ${this.pair} on ${validExchanges.length} exchange${validExchanges.length > 1 ? 's' : ''}` + (validExchanges.length < successfullMatches ? ` (${successfullMatches - validExchanges.length} hidden)` : '')
          });
        })
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
    processQueue() {
      const now = +new Date();
      const inQueue = Object.keys(QUEUE);

      const output = [];

      for (let i = 0; i < inQueue.length; i++) {
        const trade = QUEUE[inQueue[i]];
        if (now - trade.timestamp > 50) {
          trade.price /= trade.size
          this.calculateSlippage(trade)
          output.push(trade)

          delete QUEUE[inQueue[i]]
        }
      }

      if (output.length) {
        this.$emit('trades.aggr', output);
      }
    },
    calculateSlippage(trade) {
      const type = this.showSlippage;
      if (type === 'price') {
        trade.slippage = (trade.ref - trade.price) * -1;
      } else if (type === 'bps') {
        trade.slippage = Math.floor((trade.high - trade.low) / trade.low * 10000)
      }

      return trade.slippage
    },
    canFetch() {
      return this.API_URL && (!this.API_SUPPORTED_PAIRS || this.API_SUPPORTED_PAIRS.indexOf(this.pair) !== -1)
    },
    getApiUrl(from, to) {
      let url = this.API_URL

      url = url.replace(/\{from\}/, from)
      url = url.replace(/\{to\}/, to)
      url = url.replace(/\{timeframe\}/, this.timeframe * 1000)
      url = url.replace(/\{pair\}/, this.pair.toLowerCase())
      url = url.replace(/\{exchanges\}/, this.actives.join('+'))

      return url
    },
    fetchHistoricalData(from, to) {
      const url = this.getApiUrl(from, to)

      if (this.lastFetchUrl === url) {
        return Promise.reject()
      }

      this.lastFetchUrl = url

      store.commit('app/TOGGLE_LOADING', true)

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
            if (!response.data || typeof response.data !== 'object') {
              return reject()
            }

            const format = response.data.format
            let data = response.data.results

            if (!data.length) {
              return reject()
            }

            switch (response.data.format) {
              case 'point':
                ;({ from, to, data } = this.normalisePoints(data))
                break
              default:
                break
            }

            const output = {
              format: format,
              data: data,
              from: from,
              to: to
            }

            this.$emit('historical', output)

            resolve(output)
          })
          .catch(err => {
            err &&
            store.dispatch('app/showNotice', {
              type: 'error',
              message: `API error (${err.response && err.response.data && err.response.data.error ? err.response.data.error : err.message || 'unknown error'})`
            });

            reject()
          })
          .then(() => {
            this._fetchedTime += to - from

            this.$emit('fetchEnd', to - from)

            store.commit('app/TOGGLE_LOADING', false)
          })
      })
    },
    normalisePoints(data) {
      if (!data || !data.length) {
        return data
      }

      const initialTs = +new Date(data[0].time) / 1000
      const exchanges = []

      let refs = {}

      for (let i = data.length - 1; i >= 0; i--) {
        refs[data[i].exchange] = data[i].open
        data[i].vbuy = data[i].vol_buy
        data[i].vsell = data[i].vol_sell
        data[i].cbuy = data[i].count_buy
        data[i].csell = data[i].count_sell
        data[i].lbuy = data[i].liquidation_buy
        data[i].lsell = data[i].liquidation_sell
        data[i].timestamp = +new Date(data[i].time) / 1000

        delete data[i].time
        delete data[i].count
        delete data[i].vol
        delete data[i].vol_buy
        delete data[i].vol_sell
        delete data[i].count_buy
        delete data[i].count_sell
        delete data[i].liquidation_buy
        delete data[i].liquidation_sell

        if (data[i].time === initialTs) {
          delete refs[data[i].exchange]
          exchanges.push(data[i].exchange)
        }
      }

      for (let exchange in refs) {
        data.unshift({
          timestamp: initialTs,
          exchange: exchange,
          open: refs[exchange],
          high: refs[exchange],
          low: refs[exchange],
          close: refs[exchange],
          vbuy: 0,
          vsell: 0,
          lbuy: 0,
          lsell: 0,
          cbuy: 0,
          csell: 0
        })

        exchanges.push(exchange)
      }

      return {
        data,
        exchanges,
        from: data[0].timestamp,
        to: data[data.length - 1].timestamp
      }
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
