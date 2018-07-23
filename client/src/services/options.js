import Vue from 'vue'
import socket from './socket'

const emitter = new Vue({
  data() {
    return {
      threshold: 100000,
      maxRows: 20,
      pair: 'BTCUSD',
      avgPeriods: 2,
      useWeighedAverage: true,
      timeframe: '1.5%',
      wipeCache: true,
      wipeCacheDuration: 15,
      disabled: ['bithumb', 'hitbtc'],
      filters: [],
      debug: false,
      dark: true,
      significantTradeThreshold: 100000,
      hugeTradeThreshold: 1000000,
      rareTradeThreshold: 10000000,
      useShades: true,
      useAudio: false,
      audioIncludeAll: true,
      audioVolume: 1.5,
      settings: [],
      showPlotsSignificants: false,
      showPlotsLiquidations: false,
    }
  },
  created() {
    for (let prop in this.$data) {
      this.$watch(prop, this.onChange.bind(this, prop));
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
      this.$emit('change', {
        prop: prop,
        value: current
      })
    }
  }
});

export default emitter;