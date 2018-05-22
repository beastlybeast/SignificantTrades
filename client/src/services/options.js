import Vue from 'vue'

const emitter = new Vue({
  data() {
    return {
      threshold: 100000,
      maxRows: 20,
      pair: 'BTCUSD',
      avgPeriods: 2,
      useWeighedAverage: true,
      timeframe: '1.5%',
      exchanges: [],
      debug: false,
      dark: true,
      significantTradeThreshold: 100000,
      hugeTradeThreshold: 1000000,
      rareTradeThreshold: 10000000,
      useShades: true
    }
  },
  created() {
    for (let prop in this.$data) {
      this.$watch(prop, this.onChange.bind(this, prop));
    }
  },
  methods: {
    toggleExchange(exchange) {
      const index = this.exchanges.indexOf(exchange);

      if (index === -1) {
        this.exchanges.push(exchange);
      } else {
        this.exchanges.splice(index, 1);
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