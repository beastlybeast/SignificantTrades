<template>
	<div id="app" :data-currency="currency" :data-commodity="commodity" :data-symbol="symbol" :data-pair="pair">
		<Settings v-if="showSettings" @close="showSettings = false"/>
		<div class="app-wrapper">
			<Alerts/>
			<Header @settings="showSettings = !showSettings"/>
			<TradeChart/>
			<TradeList/>
		</div>
	</div>
</template>

<script>
import socket from './services/socket';
import options from './services/options';

import Alerts from './components/Alerts.vue';
import Header from './components/Header.vue';
import Settings from './components/Settings.vue';
import TradeList from './components/TradeList.vue';
import TradeChart from './components/TradeChart.vue';

window.formatPrice = function(price, precision) {
  price = +price;

  if (isNaN(price) || !price) {
    return (0).toFixed(precision);
  }

  if (precision) {
    return price.toFixed(precision);
  }

  if (price <= 0.0001) {
    return (price * 100000000).toFixed() + ' <small>sats</small>';
  } else if (price >= 1000) {
    return +price.toFixed(2);
  }

  if (options.precision) {
    return +price.toFixed(options.precision);
  }

  const firstDigitIndex = price.toString().match(/[1-9]/);

  if (firstDigitIndex) {
    return +price.toFixed(
      Math.max(8 - price.toFixed().length, firstDigitIndex.index + 1)
    );
  }

  return +price.toFixed(8 - price.toFixed().length);
};

window.formatAmount = function(amount, precision) {
  if (amount >= 1000000) {
    amount = (amount / 1000000).toFixed(1) + 'M';
  } else if (amount >= 1000) {
    amount = (amount / 1000).toFixed(1) + 'K';
  } else {
    amount = formatPrice(amount, precision);
  }

  return amount;
};

window.pad = function(num, size) {
  var s = '000000000' + num;
  return s.substr(s.length - size);
};

export default {
  components: {
    Alerts,
    Header,
    Settings,
    TradeList,
    TradeChart
  },
  name: 'app',
  data() {
    return {
      pair: 'BTCUSD',
      currency: 'dollar',
      commodity: 'bitcoin',
      symbol: '$',

      showSettings: false,
      showStatistics: false
    };
  },
  created() {
    socket.$on('pairing', pair => {
      this.pair = options.pair = pair;

      this.updatePairCurrency(this.pair);
    });
  },
  mounted() {
    // Test if there is some kind of adblocker ON
    fetch('showads.js')
      .then(() => {})
      .catch((response, a) => {
        socket.$emit('alert', {
          type: 'error',
          title: `Disable your AdBlocker`,
          message: `Some adblockers may block access to exchanges api.\nMake sure to turn it off, there is no ads anyway :-)`,
          id: `adblock_error`
        });
      });

    socket.initialize();
  },
  methods: {
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
        if (new RegExp(symbol + '$').test(options.pair)) {
          this.currency = symbols[symbol][0];
          this.symbol = symbols[symbol][1];
        }

        if (new RegExp('^' + symbol).test(options.pair)) {
          this.commodity = symbols[symbol][0];
        }
      }
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
  }

  .settings__container {
    background-color: $dark;
  }

  .stack__container {
    .stack__wrapper code {
      background-color: rgba(white, 0.1);
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

body.twitch {
  background: none !important;
}

#app {
  width: 100%;
  overflow: hidden;
  position: relative;
  min-height: 250px;

  .icon-commodity:before {
    content: unicode($icon-coin);
  }

  &[data-currency="dollar"] .icon-currency:before {
    content: unicode($icon-dollar);
  }

  &[data-currency="euro"] .icon-currency:before {
    content: unicode($icon-euro);
  }

  &[data-currency="yen"] .icon-currency:before {
    content: unicode($icon-yen);
  }

  &[data-currency="bitcoin"] .icon-currency:before {
    content: unicode($icon-btc);
  }

  &[data-currency="ethereum"] .icon-currency:before {
    content: unicode($icon-eth);
  }

  &[data-currency="pound"] .icon-currency:before {
    content: unicode($icon-pound);
  }

  &[data-commodity="bitcoin"] .icon-commodity:before {
    content: unicode($icon-btc);
  }

  &[data-commodity="ethereum"] .icon-commodity:before {
    content: unicode($icon-eth);
  }
}

.stack__container {
  transform: none;
  overflow: hidden;
  max-height: 1000px;
  font-size: 12px;

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
    max-height: 100%;
    overflow: auto;
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
