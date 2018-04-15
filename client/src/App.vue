<template>
  <div id="app" :data-currency="currency" :data-commodity="commodity" :data-symbol="symbol" :data-pair="pair">
    <Settings/>
    <div class="app-wrapper">
      <Alerts/>
      <Header/>
      <TradeChart/>
      <TradeList/>
    </div>
  </div>
</template>

<script>
  import Alerts from './components/Alerts.vue';
  import Header from './components/Header.vue';
  import Settings from './components/Settings.vue';
  import TradeList from './components/TradeList.vue';
  import TradeChart from './components/TradeChart.vue';
  import socket from './services/socket';
  import options from './services/options';

  export default {
    components: {
      Alerts, Header, Settings, TradeList, TradeChart
    },
    name: 'app',
    data() {
      return {
        pair: 'BTCUSD',
        currency: 'dollar',
        commodity: 'bitcoin',
        symbol: '$',
      }
    },
    created() {
      const settings = JSON.parse(localStorage.getItem('options'));

      socket.$on('pair', pair => {
        this.pair = options.pair = pair;

        this.updatePairCurrency(this.pair);
      });

      if (settings && typeof settings === 'object') {
        for (let name of Object.keys(settings)) {
          options[name] = settings[name];
        }
      }

      window.addEventListener('beforeunload', () => {        
        localStorage.setItem('options', JSON.stringify(options.$data));
      });

      window.formatPrice = function(price) {
        price = +price;

        if (isNaN(price) || !price) {
          return '0.00';
        }

        if (price <= 0.0001) {
          return (price * 100000000).toFixed() + ' <small>sats</small>';
        } else if (price >= 1000) {
          return price.toFixed(2);
        }

        const firstDigitIndex = price.toString().match(/[1-9]/);

        if (firstDigitIndex) {
          return price.toFixed(Math.max(6 - price.toFixed().length, firstDigitIndex.index + 1));
        }

        return price.toFixed(6 - price.toFixed().length);
      }
    },
    mounted() {
      socket.connect();
    },
    methods: {
      updatePairCurrency(pair) {
        const symbols = {
          BTC: ['bitcoin', '฿'],
          GBP: ['pound', '£'],
          EUR: ['euro', '€'],
          USD: ['dollar', '$'],
          JPY: ['yen', '¥'],
          ETH: ['ethereum', 'ETH'],
        }

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
  }
</script>

<style lang="scss">
	@import './assets/sass/variables';
	@import './assets/sass/basic';
	@import './assets/sass/icons';

  .icon-commodity,
  .icon-currency {
    top: 1px;
    position: relative;
  }

  #app {
    width: 100%;
    overflow: hidden;
    position: relative;
    min-height: 250px;

    @media only screen and (min-width: 768px) {
      width: 320px;
    }

    > .app-wrapper {
      transition: all .2s $easeOutExpo;
    }
    
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
</style>
