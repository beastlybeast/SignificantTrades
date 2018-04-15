import Vue from 'vue'

const emitter = new Vue({
  data() {
    return {
      groupBy: 100000,
      maxRows: 20,
      pair: 'BTCUSD',
      averageLength: 3,
      tickLength: '1%',
      exchanges: [],
      debug: false
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
    follow() {
      this.$emit('follow');
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