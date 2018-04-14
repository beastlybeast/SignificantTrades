import Vue from 'vue'

const emitter = new Vue({
  data() {
    return {
      url: process.env.API_URL || 'ws://localhost:3000',
      groupBy: 100000,
      maxRows: 20,
      pair: 'BTCUSD',
      excluded: '',
      averageLength: 3,
      tickLength: '1%',
      exchanges: [],
      debug: false
    }
  },
  created() {
    this.http_url = this.url.replace(/^ws(s?)\:\/\//, 'http$1://');

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