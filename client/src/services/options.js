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
      this.opened = true;
      this.$emit('open');
    },
    hide() {
      this.opened = false;
      this.$emit('close');
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