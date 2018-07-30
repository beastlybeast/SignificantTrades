import Vue from 'vue'
import Axios from 'axios'

import Kraken from '../exchanges/kraken'
import Bitmex from '../exchanges/bitmex'
import Coinex from '../exchanges/coinex'
import Huobi from '../exchanges/huobi'
import Binance from '../exchanges/binance'
import Bitfinex from '../exchanges/bitfinex'
import Bitstamp from '../exchanges/bitstamp'
import Gdax from '../exchanges/gdax'
import Hitbtc from '../exchanges/hitbtc'
import Okex from '../exchanges/okex'
import Poloniex from '../exchanges/poloniex'

import options from './options'

const exchanges = [
  // new Kraken(), <- disabled til Kraken release ws api
  /*new Bitmex(),
  new Coinex(),
  new Binance(),
  new Gdax(),
  new Bitfinex(),
  new Huobi(),
  new Bitstamp(),
  new Hitbtc(),*/
  new Okex(),
  //new Poloniex(),
];

const emitter = new Vue({
  data() {
    return {
      delay: 0,
      trades: [],
      exchanges: [],
      connected: [],
      matchs: {},
      errors: {},
      timestamps: {},
      API_URL: null,
      PROXY_URL: null,
    }
  },
  methods: {
    initialize() {
      this.exchanges = exchanges.map(exchange => exchange.id);

      console.log(`[sockets] initializing ${this.exchanges.length} exchange(s)`);

      if (process.env.API_URL) {
        this.API_URL = process.env.API_URL;
        console.info(`[sockets] API_URL = ${this.API_URL}`);
      }

      if (process.env.PROXY_URL) {
        this.PROXY_URL = process.env.PROXY_URL;
        console.info(`[sockets] PROXY_URL = ${this.PROXY_URL}`);
      }

      exchanges.forEach(exchange => {
        exchange.on('live_trades', data => {
          if (!data || !data.length) {
            return;
          }

          this.timestamps[exchange.id] = +new Date();

          data = data
            .sort((a, b) => a[1] - b[1]);

          if (this.delayed) {
            for (let i=0; i<data.length; i++) {
              data[i][1] -= this.delay;
            }
          }

          this.trades = this.trades.concat(data);

          const filtered = data.filter(a => options.filters.indexOf(a[0]) === -1);

          this.$emit('trades', filtered);
        });

        exchange.on('open', event => {
          console.log(`[socket.exchange.on.open] ${exchange.id} opened`);

          const index = this.connected.indexOf(exchange.id);
          index === -1 && this.connected.push(exchange.id);

          this.errors[exchange.id] = 0;

          this.$emit('connected', this.connected);
        });

        exchange.on('close', event => {
          console.log(`[socket.exchange.on.close] ${exchange.id} closed`);

          const index = this.connected.indexOf(exchange.id);
          index >= 0 && this.connected.splice(index, 1);

          this.$emit('connected', this.connected);

          if (exchange.shouldBeConnected && options.disabled.indexOf(exchange) === -1) {
            exchange.reconnect(options.pair);
          }
        });

        exchange.on('match', pair => {
          console.log(`[socket.exchange.on.match] ${exchange.id} matched ${pair}`);

          this.matchs[exchange.id] = pair;
        });

        exchange.on('error', event => {
          console.log(`[socket.exchange.on.error] ${exchange.id} reported an error`);

          if (!this.errors[exchange.id]) {
            this.errors[exchange.id] = 0;
          }

          this.errors[exchange.id]++;

          this.$emit('exchange_error', exchange.id, this.errors[exchange.id]);
        });
      });

      this.connectExchanges();
    },
    connectExchanges(pair = null) {
      this.disconnectExchanges();

      if (pair) {
        options.pair = pair;
      }

      this.trades = [];

      this.$emit('connecting', options.pair);

      console.log(`[socket.connect] connecting to "${options.pair}"`);

      Promise.all(exchanges.map(exchange => exchange.validatePair(options.pair))).then(() => {
        const validExchanges = exchanges.filter(exchange => exchange.valid && options.disabled.indexOf(exchange.id) === -1);

        console.log(`[socket.connect] ${validExchanges.length} successfully matched with "${options.pair}"`);

        this.fetchHistoricalData(1, null, true).then(data => {
          console.log(`[socket.connect] connect exchanges asynchronously`);

          validExchanges.forEach(exchange => exchange.connect());

          this.$emit('alert', {
            id: `server_status`,
            type: 'info',
            title: `Tracking ${options.pair}`,
            message: !validExchanges.length ? 'No connected exchanges' : 'On ' + validExchanges.map(exchange => exchange.id).join(', ').toUpperCase()
          });
        })
      });
    },
    disconnectExchanges() {
      console.log(`[socket.connect] disconnect exchanges asynchronously`);

      exchanges.forEach(exchange => exchange.disconnect());
    },
    trimTradesData(timestamp) {
      let index;

      for (index = this.trades.length - 1; index >= 0; index--) {
        if (this.trades[index][1] < timestamp) {
          break;
        }
      }

      if (index < 0) {
        return;
      }

      console.log(`[socket.trim] wipe ${index + 1} trades from memory`);

      this.trades.splice(0, ++index);

      this.$emit('trim', timestamp);
    },
    getExchangeById(id) {
      for (let exchange of exchanges) {
        if (exchange.id === id) {
          return exchange;
        }
      }

      return null;
    },
    fetchHistoricalData(from, to = null, willReplace = false) {
      if (!from || this.API_URL || options.pair !== 'BTCUSD') {
        return Promise.resolve();
      }

      console.log(`[socket.fetch] retrieve ${(to ? (to - from) / 1000 / 60 : from).toFixed(2)} minute(s) of trades`);

      const url = `${process.env.API_URL ? process.env.API_URL : ''}/history/${parseInt(from)}${to ? '/' + parseInt(to) : ''}`;

      if (this.lastFetchUrl === url) {
        return Promise.resolve();
      }

      this.lastFetchUrl = url;

      return new Promise((resolve, reject) => {
        Axios.get(url, {
          onDownloadProgress: e => this.$emit('fetchProgress', {
            loaded: e.loaded,
            total: e.total,
            progress: e.loaded / e.total
          })
        })
        .then(response => {
          const trades = response.data;
          const count = this.trades.length;

          if (this.delayed) {
            for (let i=0; i<trades.length; i++) {
              trades[i][1] -= this.delay;
            }
          }

          if (willReplace || !this.trades || !this.trades.length) {
            this.trades = trades;
          } else {
            const prepend = trades.filter(trade => trade[1] <= this.trades[0][1]);
            const append = trades.filter(trade => trade[1] >= this.trades[this.trades.length - 1][1]);

            if (prepend.length) {
              this.trades = prepend.concat(this.trades);
            }

            if (append.length) {
              this.trades = this.trades.concat(append);
            }
          }

          if (count !== this.trades.length) {
            this.$emit('historical', willReplace);
          }

          resolve(trades);
        })
        .catch(err => {
          err && this.$emit('alert', {
            type: 'error',
            title: `Unable to retrieve history`,
            message: err.message,
            id: `fetch_error`
          });

          reject(err);
        })
      });
    }
  }
});

export default emitter;