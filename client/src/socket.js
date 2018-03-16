import Vue from 'vue'

const emitter = new Vue({
  data() {
    return {
      socket: null,
      count: 0
    }
  },
  methods: {
    connect() {
      console.log('connect()');
      this.socket = new WebSocket('ws://localhost:3000');

      this.socket.onopen = event => {
        console.log('emitter emit connected');
        this.$emit('connected', event);

        this.interval = setInterval(() => {
          this.socket.send(`Message Number ${++this.count}`)
        }, 1000)
      }

      this.socket.onmessage = event => {
        console.log('emitter emit message');
        this.$emit('message', event);
      }

      this.socket.onclose = () => {
        console.log('emitter emit disconnected');
        this.$emit('disconnected');

        clearInterval(this.interval);
      }

      this.socket.onerror = err => {
        console.log('emitter emit error');
        this.$emit('error', err);
      }
    },
    disconnect() {
      console.log('disconnect');
      this.socket && this.socket.close();
    }
  }
});

export default emitter;