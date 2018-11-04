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
        @toggleSettings="showSettings = !showSettings"
      />
			<Chart/>
      <Counter v-if="enableCounters"/>
			<TradeList/>
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
import Counter from './components/Counter.vue';

export default {
  components: {
    Alerts,
    Header,
    Settings,
    TradeList,
    Chart,
    Counter
  },
  name: 'app',
  data() {
    return {
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
      'enableCounters',
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
  },
  mounted() {
  },
  beforeDestroy() {
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
      window.document.body.classList[isDarkMode ? 'add' : 'remove']('dark');
    }
  }
};
</script>

<style lang='scss'>
@import './assets/sass/variables';
@import './assets/sass/basic';
@import './assets/sass/icons';

.icon-commodity,
.icon-currency {
  top: 1px;
  position: relative;
}

.tippy-tooltip {
  &.blue-theme {
    background-color: $blue;
  }

  ul,
  ol {
    text-align: left;
    font-size: 90%;
    line-height: 1.2;
    padding-left: 20px;

    li {
      margin-bottom: 5px;

      &:last-child {
        margin: 0;
      }
    }
  }
}

body.dark {
  background-color: $dark;
  color: white;

  header.header {
    background-color: lighten($dark, 10%);
    color: white;

    button {
      color: white;
    }
  }

  .settings__container,
  .settings__container .stack__scroller {
    background-color: $dark;
  }

  .settings__container + .app__wrapper {
    filter: none;
  }

  .stack__container {
    .stack__wrapper code {
      background-color: rgba(white, 0.1);
    }

    .stack__backdrop {
      background-color: rgba(black, .5);
    }

    .stack__toggler {
      color: white;
    }
  }

  .chart__container .chart__selection {
    background-color: rgba(white, 0.1);
  }

  .trades__item.trades__item--sell {
    color: lighten($red, 15%);
    background-color: rgba($red, 0.1);

    &.trades__item--significant {
      background-color: $red;
      color: white;
    }
  }

  .trades__item.trades__item--buy {
    color: $green;
    background-color: rgba($green, 0.1);

    &.trades__item--significant {
      background-color: $green;
      color: white;
    }
  }
}

#app {
  width: 100%;
  overflow: hidden;
  position: relative;
  min-height: 100%;

  .icon-commodity:before {
    content: unicode($icon-coin);
  }

  &[data-currency='dollar'] .icon-currency:before {
    content: unicode($icon-dollar);
  }

  &[data-currency='euro'] .icon-currency:before {
    content: unicode($icon-euro);
  }

  &[data-currency='yen'] .icon-currency:before {
    content: unicode($icon-yen);
  }

  &[data-currency='bitcoin'] .icon-currency:before {
    content: unicode($icon-btc);
  }

  &[data-currency='ethereum'] .icon-currency:before {
    content: unicode($icon-eth);
  }

  &[data-currency='pound'] .icon-currency:before {
    content: unicode($icon-pound);
  }

  &[data-commodity='bitcoin'] .icon-commodity:before {
    content: unicode($icon-btc);
  }

  &[data-commodity='ethereum'] .icon-commodity:before {
    content: unicode($icon-eth);
  }
}

.app__wrapper {
  height: 100%;
  transition: transform .3s $easeOutExpo;
}

.stack__container {
  transform: none;
  overflow: hidden;
  max-height: 1000px;
  font-size: 12px;
  z-index: 1;

  @media screen and (min-width: 500px) {
    .stack__backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;

      display: block;
      background-color: rgba(white, 0.5);
      pointer-events: none;
    }
  }

  .stack__scroller {
    overflow: auto;
    position: relative;
    max-height: 100%;
  }

  .stack__toggler {
    position: absolute;
    right: 0;
    top: 0;
    font-size: 18px;
    opacity: 0.2;
    padding: 8px;
    z-index: 1;

    &:hover {
      opacity: 1;
    }
  }

  .stack__wrapper {
    padding: 8px 10px;
    position: relative;

    p {
      margin: 0 0 2px;

      &:last-child {
        margin: 0;
      }
    }

    code {
      background-color: rgba(black, 0.1);
      font-weight: 400;
      padding: 3px 4px;
      line-height: 1;
      display: inline-block;
      position: relative;
      letter-spacing: -0.5px;
    }
  }
}
</style>
