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
  new Kraken(), 
  new Bitmex(),
  new Coinex(),
  new Binance(),
  new Gdax(),
  new Bitfinex(),
  new Huobi(),
  new Bitstamp(),
  new Hitbtc(),
  new Okex(),
  new Poloniex(),
];

const emitter = new Vue({
  data() {
    return {
      delay: 0,
      trades: [],
      exchanges: [],
      connected: [],
      fails: {},
      timestamps: {},
    }
  },  
  methods: {
    initialize() {
      this.exchanges = exchanges.map(exchange => exchange.id);

      console.log(`[sockets] initializing ${this.exchanges.length} exchange(s)`);

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
          const index = this.connected.indexOf(exchange.id);
          index === -1 && this.connected.push(exchange.id);

          this.fails[exchange.id] = 0;

          this.$emit('connected', this.connected);
        });

        exchange.on('error', event => {
          
        });

        exchange.on('close', event => {
          const index = this.connected.indexOf(exchange.id);
          index >= 0 && this.connected.splice(index, 1);

          this.$emit('connected', this.connected);

          if (exchange.shouldBeConnected && options.disabled.indexOf(exchange) === -1) {
            exchange.reconnect(options.pair);
          }
        });

        exchange.on('error', event => {
          if (!this.fails[exchange.id]) {
            this.fails[exchange.id] = 0;
          }

          this.fails[exchange.id]++;

          this.$emit('fails', this.fails, exchange.id);
        });
      });

      this.connect();
    },
    connect(pair = null) {
      this.disconnect();

      if (pair) {
        options.pair = pair;
      }

      this.trades = [];

      this.$emit('connecting', options.pair);
      
      Promise.all(exchanges.map(exchange => exchange.validatePair(options.pair))).then(() => {
        const validExchanges = exchanges.filter(exchange => exchange.valid && options.disabled.indexOf(exchange.id) === -1);

        return Promise.all(validExchanges.map(exchange => exchange.fetchRecentsTrades()))
          .then(data => {
            console.log('then?', data);
            for (let trades of data) {
              if (trades && trades.length) {
                this.trades = this.trades
                  .concat(trades)
                  .sort((a, b) => a[1] - b[1]);
              }
            }

            this.$emit('historical', true);

            validExchanges.forEach(exchange => exchange.connect());

            this.$emit('alert', {
              id: `server_status`,
              type: 'info',
              title: `Tracking ${options.pair}`,
              message: !validExchanges.length ? 'No connected exchanges' : 'On ' + validExchanges.map(exchange => exchange.id).join(', ').toUpperCase()
            });
          });
      });
    },
    disconnect() {
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
      if (!to) {
        to = +new Date();
        from = to - from * 1000 * 60;
        willReplace = true;
      }

      const url = `${process.env.API_URL ? process.env.API_URL : ''}/history/${parseInt(from)}/${parseInt(to)}`;

      if (this.lastFetchUrl === url) {
        return new Promise((resolve, reject) => resolve());
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