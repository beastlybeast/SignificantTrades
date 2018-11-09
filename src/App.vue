<template>
	<div
    id="app"
    :data-currency="currency"
    :data-commodity="commodity"
    :data-symbol="symbol"
    :data-pair="pair"
  >
		<Settings v-if="showSettings" @close="showSettings = false"/>
		<div class="app__wrapper">
			<Alerts/>
			<Header
        :price="price"
        @toggleSettings="showSettings = !showSettings"
      />
      <div class="app__layout">
        <Chart v-if="showChart"/>
        <div class="app__widgets">
          <Stats v-if="showStats"/>
          <Counters v-if="showCounters"/>
          <TradeList/>
        </div>
      </div>
		</div>
	</div>
</template>

<script>
import { mapState } from 'vuex';

import socket from './services/socket';

import Alerts from './components/Alerts.vue';
import Header from './components/Header.vue';
import Settings from './components/Settings.vue';
import TradeList from './components/TradeList.vue';
import Chart from './components/chart/Chart.vue';
import Counters from './components/Counters.vue';
import Stats from './components/Stats.vue';

export default {
  components: {
    Alerts,
    Header,
    Settings,
    TradeList,
    Chart,
    Counters,
    Stats
  },
  name: 'app',
  data() {
    return {
      price: null,
      currency: 'dollar',
      commodity: 'bitcoin',
      symbol: '$',

      showSettings: false,
      showStatistics: false
    };
  },
  computed: {
    ...mapState([
      'dark',
      'pair',
      'showCounters',
      'showStats',
      'showChart',
      'decimalPrecision'
    ])
  },
  created() {
    this.$root.formatPrice = this.formatPrice.bind(this);
    this.$root.formatAmount = this.formatAmount.bind(this);
    this.$root.padNumber = this.padNumber.bind(this);
    this.$root.ago = this.ago.bind(this);

    socket.$on('pairing', value => {
      this.updatePairCurrency(this.pair);
    });

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'toggleDark':
          this.toggleDarkChart(mutation.payload);
        break;
      }
    });

    this.toggleDarkChart(this.dark);

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
        });
      });

    socket.initialize();

    this.updatePrice();
  },
  mounted() {
  },
  beforeDestroy() {
    clearTimeout(this._updatePriceTimeout);

    this.onStoreMutation();
  },
  methods: {
    padNumber(num, size) {
      var s = '000000000' + num;
      return s.substr(s.length - size);
    },
    formatAmount(amount, decimals) {
      if (amount >= 1000000) {
        amount = (amount / 1000000).toFixed(1) + 'M';
      } else if (amount >= 1000) {
        amount = (amount / 1000).toFixed(1) + 'K';
      } else {
        amount = this.$root.formatPrice(amount, decimals);
      }

      return amount;
    },
    formatPrice(price, decimals) {
      price = +price;

      if (isNaN(price) || !price) {
        return (0).toFixed(decimals);
      }

      if (typeof decimals !== 'undefined') {
        return price.toFixed(decimals);
      }

      if (price <= 0.0001) {
        return (price * 100000000).toFixed() + ' <small>sats</small>';
      } else if (price >= 1000) {
        return +price.toFixed(2);
      }

      if (this.decimalPrecision) {
        return +price.toFixed(this.decimalPrecision);
      }

      const firstDigitIndex = price.toString().match(/[1-9]/);

      if (firstDigitIndex) {
        return +price.toFixed(
          Math.max(8 - price.toFixed().length, firstDigitIndex.index + 1)
        );
      }

      return +price.toFixed(8 - price.toFixed().length);
    },
    ago(timestamp) {
      const seconds = Math.floor((new Date() - timestamp) / 1000);
      let interval, output;

      if ((interval = Math.floor(seconds / 31536000)) > 1) output = interval + 'y';
      else if ((interval = Math.floor(seconds / 2592000)) > 1) output = interval + 'm';
      else if ((interval = Math.floor(seconds / 86400)) > 1) output = interval + 'd';
      else if ((interval = Math.floor(seconds / 3600)) > 1) output = interval + 'h';
      else if ((interval = Math.floor(seconds / 60)) > 1) output = interval + 'm';
      else output = Math.ceil(seconds) + 's';

      return output;
    },
    updatePairCurrency(pair) {
      const symbols = {
        BTC: ['bitcoin', '฿'],
        GBP: ['pound', '£'],
        EUR: ['euro', '€'],
        USD: ['dollar', '$'],
        JPY: ['yen', '¥'],
        ETH: ['ethereum', 'ETH']
      };

      this.currency = 'dollar';
      this.commodity = 'coin';
      this.symbol = '$';

      for (let symbol of Object.keys(symbols)) {
        if (new RegExp(symbol + '$').test(pair)) {
          this.currency = symbols[symbol][0];
          this.symbol = symbols[symbol][1];
        }

        if (new RegExp('^' + symbol).test(pair)) {
          this.commodity = symbols[symbol][0];
        }
      }
    },
    toggleDarkChart(isDarkMode) {
      window.document.body.classList[isDarkMode ? 'add' : 'remove']('theme-dark');
    },
    updatePrice() {
      let price = 0;
      let weight = 0;

      for (let exchange of socket.exchanges) {
        if (exchange.price === null || exchange.weight === null) {
          continue;
        }

        price += exchange.price * exchange.weight;
        weight += exchange.weight;
      }

      price = price / weight;

      this.price = this.$root.formatPrice(price);

      window.document.title = this.price
        .toString()
        .replace(/<\/?[^>]+(>|$)/g, '');

      /* if (direction) {
        let favicon = document.getElementById('favicon');

        if (!favicon || favicon.getAttribute('direction') !== direction) {
          if (favicon) {
            document.head.removeChild(favicon);
          }

          favicon = document.createElement('link');
          favicon.id = 'favicon';
          favicon.rel = 'shortcut icon';
          favicon.href = `static/${direction}.png`;

          favicon.setAttribute('direction', direction);

          document.head.appendChild(favicon);
        }
      } */

      this._updatePriceTimeout = setTimeout(this.updatePrice, 1000);
    }
  }
};
</script>

<style lang='scss'>
@import './assets/sass/variables';
@import './assets/sass/helper';
@import './assets/sass/layout';
@import './assets/sass/icons';
@import './assets/sass/currency';
@import './assets/sass/tooltip';

@import './assets/sass/dark';
</style>
