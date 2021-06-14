import EventEmitter from 'eventemitter3'

import store from '../store'

class Exchange extends EventEmitter {
  constructor(options) {
    super()

    this.indexedProducts = []
    this.connected = false
    this.valid = false
    this.price = null
    this.error = null
    this.shouldBeConnected = false
    this.reconnectionDelay = 1000

    this._pair = []

    this.options = Object.assign(
      {
        // default exchanges options
      },
      options || {}
    )
  }

  set pair(name) {
    if (!this.products || !name) {
      this._pair = []
      return
    }

    this._pair = name
      .split('+')
      .map(a => {
        if (this.matchPairName && typeof this.matchPairName === 'function') {
          return this.matchPairName(a)
        } else if (Array.isArray(this.products) && this.products.indexOf(a) !== -1) {
          return a
        } else if (typeof this.products === 'object') {
          return this.products[a] || null
        } else {
          return null
        }
      })
      .filter(a => !!a)
  }

  get pair() {
    return this._pair[0]
  }

  get pairs() {
    return this._pair
  }

  initialize() {
    try {
      const storage = JSON.parse(localStorage.getItem(this.id))

      if (storage && +new Date() - storage.timestamp < 1000 * 60 * 60 * 24 * 7 && (this.id !== 'okex' || storage.timestamp > 1560235687982)) {
        if (storage.data && typeof storage.data === 'object' && Object.prototype.hasOwnProperty.call(storage.data, 'products')) {
          for (let key in storage.data) {
            this[key] = storage.data[key]
          }
        } else {
          this.products = storage.data
        }

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

    this.indexProducts()
  }

  connect(reconnection = false) {
    if (this.connected) {
      this.disconnect()
    }

    if (this.valid) {
      if (this.api) {
        console.warn('previous connection not fully closed')
        return new Promise((resolve, reject) => {
          this.connectUponCloseResolver = { resolve, reject }
        }).then(this.connect.bind(this))
      }

      if (this.connectUponCloseResolver) {
        this.connectUponCloseResolver.reject()
        delete this.connectUponCloseResolver
      }

      this.shouldBeConnected = true

      console.log(`[${this.id}] ${reconnection ? 're' : ''}connecting... (${this.pairs.join(', ')})`)

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

    console.log(`[${this.id}] schedule reconnection (${this.reconnectionDelay} ms)`)

    this.reconnectionTimeout = setTimeout(() => {
      if (!this.connected) {
        this.connect(true)
      }
    }, this.reconnectionDelay)

    this.reconnectionDelay *= 2
  }

  emitOpen(event) {
    this.connected = true
    this.error = false

    this.reconnectionDelay = 1000

    this.emit('open', event)
  }

  queueTrades(trades) {
    if (!trades || !trades.length) {
      return
    }

    this.price = trades[trades.length - 1].price

    this.emit('trades', trades)
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

    if (this.api) {
      delete this.api
    }

    if (this.connectUponCloseResolver) {
      this.connectUponCloseResolver.resolve()
      delete this.connectUponCloseResolver
    }

    this.emit('close', event)
  }

  getUrl() {
    return typeof this.options.url === 'function' ? this.options.url.apply(this, arguments) : this.options.url
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
      return this.fetchProducts().then(() => this.validatePair(pair))
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

    store.commit('app/INDEX_PRODUCTS', {
      pairs: this.indexedProducts,
      exchange: this.id
    })
  }

  fetchProducts() {
    if (!this.endpoints || !this.endpoints.PRODUCTS) {
      this.products = []

      return Promise.resolve()
    }

    let urls = typeof this.endpoints.PRODUCTS === 'function' ? this.endpoints.PRODUCTS(this.pair) : this.endpoints.PRODUCTS

    if (!Array.isArray(urls)) {
      urls = [urls]
    }

    console.log(`[${this.id}] fetching products...`, urls)

    return new Promise(resolve => {
      return Promise.all(
        urls.map(action => {
          action = action.split('|')

          let method = action.length > 1 ? action.shift() : 'GET'
          let url = action[0]

          return new Promise(resolve => {
            setTimeout(() => {
              resolve(
                fetch(`${store.state.app.proxyUrl ? store.state.app.proxyUrl : ''}${url}`, {
                  method: method
                })
                  .then(response => response.json())
                  .catch(err => {
                    console.log(err)

                    return null
                  })
              )
            }, 500)
          })
        })
      ).then(data => {
        console.log(`[${this.id}] received API products response => format products`)

        if (data.indexOf(null) !== -1) {
          data = null
        } else if (data.length === 1) {
          data = data[0]
        }

        if (data) {
          const formatedProducts = this.formatProducts(data) || []

          if (typeof formatedProducts === 'object' && Object.prototype.hasOwnProperty.call(formatedProducts, 'products')) {
            for (let key in formatedProducts) {
              this[key] = formatedProducts[key]
            }
          } else {
            this.products = formatedProducts
          }

          console.log(`[${this.id}] storing products`, this.products)

          localStorage.setItem(
            this.id,
            JSON.stringify({
              timestamp: +new Date(),
              data: formatedProducts
            })
          )
        } else {
          this.products = null
        }

        this.indexProducts()

        resolve(this.products)
      })
    })
  }
}

export default Exchange
