<template>
  <div
    id="app"
    :data-prefer="preferQuoteCurrencySize ? 'quote' : 'base'"
    :data-base="baseCurrency"
    :data-quote="quoteCurrency"
    :data-symbol="symbol"
    :data-pair="pair"
    :class="{
      loading: isLoading,
    }"
  >
    <Settings v-if="showSettings" @close="showSettings = false" />
    <div class="app__wrapper">
      <Alerts />
      <Header :price="price" @toggleSettings="showSettings = !showSettings" />
      <div class="app__layout">
        <Chart v-if="showChart" />
        <div class="app__right">
          <TradeList />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { MASTER_DOMAIN, formatPrice, formatAmount } from './utils/helpers'

import socket from './services/socket'
import touchevent from './utils/touchevent'

import Alerts from './components/Alerts.vue'
import Header from './components/Header.vue'
import Settings from './components/Settings.vue'
import TradeList from './components/TradeList.vue'
import Chart from './components/chart/Chart.vue'
import Exchanges from './components/Exchanges.vue'

const faviconDirection = {
  direction: null,
  prices: [],
  sum: 0
}

export default {
  components: {
    Alerts,
    Header,
    Settings,
    TradeList,
    Chart,
    Exchanges
  },
  name: 'app',
  data() {
    return {
      price: null,
      baseCurrency: 'bitcoin',
      quoteCurrency: 'dollar',
      symbol: '$',

      showSettings: false,
      showStatistics: false
    }
  },
  computed: {
    ...mapState(['pair', 'actives', 'showChart', 'showExchangesBar', 'decimalPrecision', 'autoClearTrades', 'isLoading', 'preferQuoteCurrencySize'])
  },
  created() {
    this.$root.formatPrice = formatPrice
    this.$root.formatAmount = formatAmount

    socket.$on('pairing', value => {
      this.updatePairCurrency(this.pair)
    })

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'toggleAutoClearTrades':
          this.toggleAutoClearTrades(mutation.payload)
          break
        case 'setPair':
          socket.connectExchanges(mutation.payload)
          break
      }
    })

    this.toggleAutoClearTrades(this.autoClearTrades)

    // Is request blocked by browser ?
    // If true notice user that most of the exchanges may be unavailable
    fetch('showads.js')
      .then(() => {})
      .catch((response, a) => {
        socket.$emit('alert', {
          type: 'error',
          title: `Disable your AdBlocker`,
          message: `Some adblockers may block access to exchanges api.\nMake sure to turn it off, you wont find any ads here ever :-)`,
          id: `adblock_error`
        })
      })

    socket.initialize()

    this.updatePrice()
  },
  mounted() {},
  beforeDestroy() {
    clearTimeout(this._updatePriceTimeout)

    this.onStoreMutation()
  },
  methods: {
    updatePairCurrency(pair) {
      const name = pair.replace(/\-[\w\d]*$/, '')

      const symbols = {
        BTC: ['bitcoin', '฿'],
        GBP: ['pound', '£'],
        EUR: ['euro', '€'],
        USD: ['dollar', '$'],
        JPY: ['yen', '¥'],
        ETH: ['ethereum', 'ETH'],
        XRP: ['xrp', 'XRP'],
        LTC: ['ltc', 'LTC'],
        TRX: ['trx', 'TRX'],
        ADA: ['ada', 'ADA'],
        IOTA: ['iota', 'IOTA'],
        XMR: ['xmr', 'XMR'],
        NEO: ['neo', 'NEO'],
        EOS: ['eos', 'EOS']
      }

      this.baseCurrency = 'coin'
      this.quoteCurrency = 'dollar'
      this.symbol = '$'

      for (let symbol of Object.keys(symbols)) {
        if (new RegExp(symbol + '$').test(name)) {
          this.quoteCurrency = symbols[symbol][0]
          this.symbol = symbols[symbol][1]
        }

        if (new RegExp('^' + symbol).test(name)) {
          this.baseCurrency = symbols[symbol][0]
        }
      }

      if (/^(?!XBT|BTC).*\d+$/.test(name)) {
        this.quoteCurrency = symbols.BTC[0]
        this.symbol = symbols.BTC[1]
      }
    },
    toggleAutoClearTrades(isAutoWipeCacheEnabled) {
      clearInterval(this._autoWipeCacheInterval)

      if (!isAutoWipeCacheEnabled) {
        return
      }

      /* this._autoWipeCacheInterval = setInterval(
        socket.cleanOldData.bind(socket),
        1000 * 60 * 5
      ) */
    },
    updatePrice() {
      let price = 0
      let total = 0

      for (let exchange of socket.exchanges) {
        if (exchange.price === null || this.actives.indexOf(exchange.id) === -1) {
          continue
        }

        total++
        price += exchange.price
      }

      price = price / total

      if (price) {
        this.updateFavicon(price)
      }

      this.price = formatPrice(price)

      window.document.title = this.pair + ' ' + this.price.toString().replace(/<\/?[^>]+(>|$)/g, '')

      this._updatePriceTimeout = setTimeout(this.updatePrice, 1000)
    },
    updateFavicon(price) {
      faviconDirection.sum += faviconDirection.prices[faviconDirection.prices.push(price) - 1]

      if (faviconDirection.prices.length > 7) {
        faviconDirection.sum -= faviconDirection.prices.shift()
      }

      const direction = price > faviconDirection.sum / faviconDirection.prices.length ? 'up' : 'down'

      if (direction !== faviconDirection.direction) {
        if (!faviconDirection.element) {
          faviconDirection.element = document.createElement('link')
          faviconDirection.element.id = 'favicon'
          faviconDirection.element.rel = 'shortcut icon'

          document.head.appendChild(faviconDirection.element)
        }

        faviconDirection.element.href = `static/${direction}.png`
      }
    }
  }
}
</script>

<style lang="scss">
@import './assets/sass/variables';
@import './assets/sass/helper';
@import './assets/sass/layout';
@import './assets/sass/icons';
@import './assets/sass/currency';
@import './assets/sass/tooltip';
@import './assets/sass/dropdown';
@import './assets/sass/button';
</style>
