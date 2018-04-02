import Vue from 'vue'

const emitter = new Vue({
  data() {
    return {
      groupBy: 100000,
      maxRows: 20,
      pair: 'BTCUSD',
      excluded: '',
      averageLength: 3,
      exchanges: []
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

      this.$emit('exchanges', this.exchanges);
    },
    show() {
      this.opened = true;
      this.$emit('open');
    },
    hide() {
      this.opened = false;
      this.$emit('close');
    },
  }
});

export default emitter;