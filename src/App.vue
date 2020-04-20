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
    <div class="notices">
      <Notice v-for="(notice, index) in notices" :key="index" :notice="notice" />
    </div>
    <Settings v-if="showSettings" @close="showSettings = false" />
    <div class="app__wrapper">
      <Header :price="price" @toggleSettings="showSettings = !showSettings" />
      <div class="app__layout">
        <Chart v-if="showChart" />
        <div class="app__right">
          <Counters v-if="showCounters" />
          <TradeList />
        </div>
      </div>
    </div>
    <dialogs-wrapper></dialogs-wrapper>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { MASTER_DOMAIN, formatPrice, formatAmount, movingAverage, countDecimals } from './utils/helpers'

import socket from './services/socket'
import touchevent from './utils/touchevent'

import Notice from './components/ui/Notice.vue'
import Header from './components/ui/Header.vue'
import Settings from './components/Settings.vue'
import TradeList from './components/TradeList.vue'
import Chart from './components/chart/Chart.vue'
import Counters from './components/Counters.vue'
import upFavicon from '../static/up.png'
import downFavicon from '../static/down.png'

const faviconDirection = {
  direction: null,
  index: 0,
  avg: 0
}

export default {
  components: {
    Header,
    Settings,
    TradeList,
    Chart,
    Counters,
    Notice
  },
  name: 'app',
  data() {
    return {
      price: null,
      baseCurrency: 'bitcoin',
      quoteCurrency: 'dollar',
      symbol: '$',
      

      showSettings: false,
      showStatistics: false,
      calculateOptimalPrice: true
    }
  },
  computed: {
    ...mapState('app', ['actives', 'notices']),
    ...mapState('settings', ['pair', 'showChart', 'showCounters', 'showStats', 'decimalPrecision', 'isLoading', 'preferQuoteCurrencySize'])
  },
  created() {
    this.$root.formatPrice = formatPrice
    this.$root.formatAmount = formatAmount

    socket.$on('pairing', value => {
      this.updatePairCurrency(this.pair)
    })

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'settings/SET_PAIR':
          socket.connectExchanges(mutation.payload)
          this.calculateOptimalPrice = true
          break
      }
    })

    // Is request blocked by browser ?
    // If true notice user that some of the exchanges may be unavailable
    /*fetch('showads.js')
      .then(() => {})
      .catch((response, a) => {
        socket.$emit('alert', {
          type: 'error',
          title: `Disable your AdBlocker`,
          message: `Some adblockers may block access to exchanges api.\nMake sure to turn it off, you wont find any ads here ever :-)`,
          id: `adblock_error`
        })
      })*/

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
    updatePrice() {
      let price = 0
      let total = 0
      let decimals = null;

      const activesExchangesLength = this.actives.length;

      if (this.calculateOptimalPrice) {
        decimals = [];
      }

      for (let exchange of socket.exchanges) {
        if (exchange.price === null) {
          continue
        }
        
        if (this.calculateOptimalPrice) {
          decimals.push(countDecimals(exchange.price))
        }

        if (this.actives.indexOf(exchange.id) === -1) {
          continue
        }

        total++
        price += exchange.price
      }

      if (total) {
        price = price / total

        if (this.calculateOptimalPrice && total >= activesExchangesLength / 2) {
          const optimalDecimal = Math.round(decimals.reduce((a, b) => a + b, 0) / decimals.length);
          this.$store.commit('app/SET_OPTIMAL_DECIMAL', optimalDecimal)

          delete this.calculateOptimalPrice;
        }
      }

      if (price) {
        this.updateFavicon(price)
      }

      this.price = formatPrice(price)

      window.document.title = this.pair + ' ' + this.price.toString().replace(/<\/?[^>]+(>|$)/g, '')

      this._updatePriceTimeout = setTimeout(this.updatePrice, 1000)
    },
    updateFavicon(price) {
      if (faviconDirection.index) {
        faviconDirection.avg = movingAverage(faviconDirection.avg, price, 1/(faviconDirection.index+1))
      } else {
        faviconDirection.avg = price
      }
      faviconDirection.index++;

      const direction = price > faviconDirection.avg ? 'up' : 'down'

      if (direction !== faviconDirection.direction) {
        if (!faviconDirection.element) {
          faviconDirection.element = document.createElement('link')
          faviconDirection.element.id = 'favicon'
          faviconDirection.element.rel = 'shortcut icon'

          document.head.appendChild(faviconDirection.element)
        }

        if (direction === 'up') {
          faviconDirection.element.href = upFavicon
        } else {
          faviconDirection.element.href = downFavicon
        }
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
@import './assets/sass/dialog';
@import './assets/sass/form';
@import './assets/sass/verte';
@import './assets/sass/notice';
</style>
