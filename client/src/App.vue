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
          return price.toFixed(2);
        }

        const firstDigitIndex = price.toString().match(/[1-9]/);

        if (firstDigitIndex) {
          return price.toFixed(Math.max(6 - price.toFixed().length, firstDigitIndex.index + 1));
        }

        return price.toFixed(6 - price.toFixed().length);
      }

      window.formatAmount = function(amount, precision) {
        if (amount >= 1000000) {
          amount = (amount / 1000000).toFixed(1) + 'M';
        } else if (amount >= 1000) {
          amount = (amount / 1000).toFixed(1) + 'K';
        } else {
          amount = formatPrice(amount, precision);
        }

        return amount;
      }
    },
    mounted() {
      socket.fetch(1, null, true, false)
        .then((response, err) => {
          !err && socket.connect();
        });
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

  .tippy-tooltip {
    &.blue-theme {
      background-color: $blue;
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
        background-color: rgba(white, .1);
      }

      .stack__toggler {
        color: white;
      }
    }

    .chart__container .chart__selection {
      background-color: rgba(white, .1);
    }

    .chart__detail .detail__exchange {
      background-color: rgba(white, .025);

      &:nth-child(odd) {
        background-color: rgba(white, .05);
      }

      sup {
        opacity: 1;

        &.increase {
          color: saturate($green, 25%);
        }
      }
    }

    .trades__item.trades__item--sell.trades__item--significant {
      background-color: lighten($red, 10%);
    }

    .trades__item.trades__item--sell {
      color: lighten($red, 20%);
      background-color: rgba(darken($red, 10%), .2);

      &.trades__item--significant {
        background-color: $red;
        color: white;
      }
    }

    .trades__item.trades__item--buy {
      color: lighten($green, 25%);
      background-color: rgba(lighten($green, 25%), .15);

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

  .stack__container {
    transition: all .8s $easeOutExpo .2s, visibility .1s linear 1.5s;
    visibility: hidden;
    transform: none;
    pointer-events: none;
    overflow: hidden;
    max-height: 1000px;
    font-size: 12px;

    .stack__toggler {
      position: absolute;
      right: 0;
      top: 0;
      font-size: 16px;
      opacity: .2;
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
      transform: scale(1.2);
      opacity: 0;
      transition: all .4s $easeOutExpo;
      position: relative;

      p {
        margin: 0 0 2px;

        &:last-child {
          margin: 0;
        }
      }

      code {
        background-color: rgba(black, .1);
        font-weight: 400;
        padding: 3px 4px;
        line-height: 1;
        display: inline-block;
        position: relative;
        letter-spacing: -.5px;
      }
    }

    &.open {
      transition: all .3s $easeOutExpo;
      visibility: visible;
      transform: none;
      pointer-events: auto;

      .stack__wrapper {
        transition: all .3s $easeOutExpo .2s;
        transform: none;
        opacity: 1;
      }
    }

    &:not(.open) {
      max-height: 0 !important;
    }
  }
</style>
