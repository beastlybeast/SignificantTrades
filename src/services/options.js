import Vue from 'vue'
import socket from './socket'

const emitter = new Vue({
  data() {
    return {
      thresholds: [100000, 100000, 1000000, 10000000],
      gifsThresholds: ['', '', 'cash', 'explosion'],
      exchangeThresholds: {},
      pairThresholds: {},
      maxRows: 20,
      pair: 'BTCUSD',
      avgPeriods: 2,
      useWeighedAverage: true,
      timeframe: '1.5%',
      wipeCache: true,
      wipeCacheDuration: 15,
      disabled: ['bithumb', 'hitbtc', 'kraken'],
      filters: [],
      debug: false,
      dark: true,
      useShades: true,
      useAudio: false,
      audioIncludeAll: true,
      audioVolume: 1.5,
      settings: [],
      showPlotsSignificants: false,
      showPlotsLiquidations: false,
      height: null,
    }
  },
  created() {
    for (let prop in this.$data) {
      this.$watch(prop, this.onChange.bind(this, prop));
    }

    const subdomain = window.location.hostname.match(/^([\d\w]+)\..*\./i);

    if (subdomain && subdomain.length > 2) {
      this.pair = subdomain[1].toUpperCase();
    }
  },
  methods: {
    toggleExchange(exchange) {
      const index = this.disabled.indexOf(exchange);

      if (index === -1) {
        socket.getExchangeById(exchange).disconnect();

        this.disabled.push(exchange);
      } else {
        socket.getExchangeById(exchange).connect(this.pair);

        this.disabled.splice(index, 1);
      }
    },
    toggleFilter(exchange) {
      const index = this.filters.indexOf(exchange);

      if (index === -1) {
        this.filters.push(exchange);
      } else {
        this.filters.splice(index, 1);
      }
    },
    show() {
      this.$emit('open');
    },
    hide() {
      this.$emit('close');
    },
    toggle() {
      this.$emit('toggle');
    },
    follow(state) {
      this.$emit('follow', state);
    },
    onChange(prop, current, old) {
      localStorage && localStorage.setItem('options', JSON.stringify(this.$data));

      switch (prop) {
        case 'threshold':
        case 'significantTradeThreshold':
        case 'hugeTradeThreshol':
        case 'rareTradeThreshol':
          this.pairThresholds[this.pair] = [threshold[0], threshold[1], threshold[0], threshold[0]]
        break;
      }

      this.$emit('change', {
        prop: prop,
        value: current,
        old: old
      })
    }
  }
});

export default emitter;