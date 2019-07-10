import EventEmitter from 'eventemitter3'
import store from '../services/store'

class Exchange extends EventEmitter {
  constructor(options) {
    super()

    this.id = this.constructor.name.toLowerCase()

    this.indexedProducts = []
    this.connected = false
    this.valid = false
    this.price = null
    this.error = null
    this.shouldBeConnected = false
    this.reconnectionDelay = 5000

    this._pair = []

    this.options = Object.assign(
      {
        // default exchanges options
      },
      options || {}
    )

    try {
      const storage = JSON.parse(localStorage.getItem(this.id))

      if (
        storage &&
        +new Date() - storage.timestamp < 1000 * 60 * 60 * 24 * 7 &&
        (this.id !== 'okex' || storage.timestamp > 1560235687982)
      ) {
        console.info(`[${this.id}] reading stored products`)

        this.products = storage.data

        if (
          !this.products ||
          (Array.isArray(this.products) && !this.products.length) ||
          (typeof this.products === 'object' && !Object.keys(this.products).length)
        ) {
          this.products = null
        }
      } else {
        console.info(`[${this.id}] products data expired`)
      }
    } catch (error) {
      console.error(`[${this.id}] unable to retrieve stored products`, error)
    }

    this.indexProducts();
  }

  set pair(name) {
    if (!this.products || !name) {
      this._pair = []
      return
    }

    this._pair = name.split('+').map(a => {
      if (this.matchPairName && typeof this.matchPairName === 'function') {
        return this.matchPairName(a)
      } else if (Array.isArray(this.products) && this.products.indexOf(a) !== -1) {
        return a
      } else if (typeof this.products === 'object') {
        return this.products[a] || null
      } else {
        return null
      }
    }).filter(a => !!a)
  }

  get pair() {
    return this._pair[0]
  }

  get pairs() {
    return this._pair
  }

  connect(reconnection = false) {
    if (this.connected) {
      this.disconnect()
    }

    if (this.valid) {
      console.log(
        `[${this.id}] ${reconnection ? 're' : ''}connecting... (${this.pairs.join(', ')})`
      )

      this.shouldBeConnected = true

      return true
    }
  }

  disconnect() {
    clearTimeout(this.reconnectionTimeout)

    this.shouldBeConnected = false
    this.price = null
    this.error = null

    return true
  }

  reconnect() {
    clearTimeout(this.reconnectionTimeout)

    if (this.connected) {
      return
    }

    console.log(
      `[${this.id}] schedule reconnection (${this.reconnectionDelay} ms)`
    )

    this.reconnectionTimeout = setTimeout(() => {
      if (!this.connected) {
        this.connect(true)
      }
    }, this.reconnectionDelay)

    this.reconnectionDelay *= 2
  }

  emitOpen(event) {
    this.connected = true

    this.reconnectionDelay = 5000

    this.emit('open', event)
  }

  emitTrades(trades) {
    if (!trades || !trades.length) {
      return
    }

    const output = this.groupTrades(trades)

    let isFirstTrade = !this.price

    this.price = output[output.length - 1][2]

    this.emit('live_trades', output, isFirstTrade)
  }

  /**
   * Larges trades are often sent in the form on multiples trades
   * For example a $1000000 trade on BitMEX can be received as 20 "small" trades, registered on the same timestamp (and side)
   * groupTrades makes sure the output is a single $1000000 
   * and not 20 multiple trades which would show as multiple 100k$ in the TradeList
   *
   * @param {*} trades -[0]id -[1]date -[2]price -[3]size -[4]side
   * @returns
   * @memberof Exchange 
   */
  groupTrades(trades) {
    const group = {}
    const sums = {}
    const mins = {}
    const maxs = {}
    const output = []

    for (let trade of trades) {
      const id = parseInt(trade[1]).toFixed() + '_' + trade[4] // timestamp + side

      trade[2] = +trade[2];
      trade[3] = +trade[3];

      if (trade[5]) {
        output.push(trade);
      } else if (group[id]) {
        group[id][2] += +trade[2]
        group[id][3] += +trade[3]
        sums[id] += trade[2] * trade[3]

        if (store.state.tradeSpray) {
          mins[id] = Math.min(mins[id] || Infinity, trade[2])
          maxs[id] = Math.max(mins[id] || 0, trade[2])
        }
      } else {
        group[id] = trade

        sums[id] = trade[2] * trade[3];
      }
    }

    const ids = Object.keys(group);

    for (let i = 0; i < ids.length; i++) {
      group[ids[i]][2] = sums[ids[i]] / group[ids[i]][3]

      if (mins[ids[i]]) {
        group[ids[i]][6] = Math.round(((maxs[ids[i]]-mins[ids[i]])/mins[ids[i]])*10000)
      }

      output.push(group[ids[i]]);
    }

    return output
  }

  toFixed(number, precision) {
    var factor = Math.pow(10, precision)
    return Math.ceil(number * factor) / factor
  }

  emitError(error) {
    this.error = error.message || 'Unknown error'

    this.emit('error')
  }

  emitClose(event) {
    this.connected = false

    this.emit('close', event)
  }

  getUrl() {
    return typeof this.options.url === 'function'
      ? this.options.url.apply(this, arguments)
      : this.options.url
  }

  formatLiveTrades(data) {
    return data
  }

  /* formatRecentsTrades(data) {
    return data;
  } */

  formatProducts(data) {
    return data
  }

  validatePair(pair) {
    this.valid = false

    if (typeof this.products === 'undefined') {
      return this.fetchProducts().then((data) => this.validatePair(pair))
    }

    if (!pair || (pair && (!(this.pair = pair) || !this.pairs.length))) {
      console.log(`[${this.id}] unknown pair ${pair}`)

      this.emit('error', new Error(`Unknown pair ${pair}`))

      this.emit('match', null)

      return Promise.resolve()
    }

    this.valid = true

    this.emit('match', this.pair)

    return Promise.resolve()
  }

  /* fetchRecentsTrades() {
    if (!this.endpoints || !this.endpoints.TRADES) {
      this.products = [];

      return Promise.resolve();
    }

    let urls = typeof this.endpoints.TRADES === 'function' ? this.endpoints.TRADES(this.pair) : this.endpoints.TRADES

    if (!Array.isArray(urls)) {
      urls = [urls];
    }

    console.log(`[${this.id}] fetching recent trades...`, urls)

    return new Promise((resolve, reject) => {
      return Promise.all(urls.map(action => {
        action = action.split('|');

        let method = action.length > 1 ? action.shift() : 'GET';
        let url = action[0];

        return fetch(`${process.env.PROXY_URL ? process.env.PROXY_URL : ''}${url}`, {method: method})
        .then(response => response.json())
        .catch(response => [])
      })).then(data => {
        console.log(`[${this.id}] received API recents trades => format trades`);

        if (data.length === 1) {
          data = data[0];
        }

        const trades = this.formatRecentsTrades(data);

        if (!trades || !trades.length) {
          return resolve();
        }

        return resolve(trades);
      });
    });
  } */

  refreshProducts() {
    localStorage.removeItem(this.id)
    this.products = null

    return this.fetchProducts()
  }

  indexProducts() {
    this.indexedProducts = []
    
    if (!this.products) {
      return
    }

    if (Array.isArray(this.products)) {
      this.indexedProducts = this.products.slice(0, this.products.length)
    } else if (typeof this.products === 'object') {
      this.indexedProducts = Object.keys(this.products)
    }
  }

  fetchProducts() {
    if (!this.endpoints || !this.endpoints.PRODUCTS) {
      this.products = []

      return Promise.resolve()
    }

    let urls =
      typeof this.endpoints.PRODUCTS === 'function'
        ? this.endpoints.PRODUCTS(this.pair)
        : this.endpoints.PRODUCTS

    if (!Array.isArray(urls)) {
      urls = [urls]
    }

    console.log(`[${this.id}] fetching products...`, urls)

    return new Promise((resolve, reject) => {
      return Promise.all(
        urls.map((action, index) => {
          action = action.split('|')

          let method = action.length > 1 ? action.shift() : 'GET'
          let url = action[0]

          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve(
                fetch(
                  `${process.env.PROXY_URL ? process.env.PROXY_URL : ''}${url}`,
                  { method: method }
                )
                  .then((response) => response.json())
                  .catch((err) => {
                    console.log(err)

                    return null
                  })
              )
            }, 500)
          })
        })
      ).then((data) => {
        console.log(
          `[${this.id}] received API products response => format products`
        )

        if (data.length === 1) {
          data = data[0]
        }

        if (data) {
          this.products = this.formatProducts(data) || []

          console.log(`[${this.id}] storing products`, this.products)

          localStorage.setItem(
            this.id,
            JSON.stringify({
              timestamp: +new Date(),
              data: this.products,
            })
          )
        } else {
          this.products = null
        }

        this.indexProducts();

        resolve(this.products)
      })
    })
  }
}

export default Exchange
