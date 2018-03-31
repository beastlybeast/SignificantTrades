import Vue from 'vue'

const emitter = new Vue({
  data() {
    return {
      groupBy: 100000,
      maxRows: 20,
      pair: 'BTCUSD',
    }
  },
  methods: {
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