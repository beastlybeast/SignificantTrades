import Vue from 'vue'

const emitter = new Vue({
  data() {
    return {
      trades: [],
      price: 6690,
      socket: null,
      count: 0
    }
  },
  created() {
    // window.onbeforeunload = this.save.bind(this);

    if (localStorage) {
      const storage = JSON.parse(localStorage.getItem('trades'));

      if (storage && storage.data && +new Date() - storage.timestamp < 1000 * 60 * 60) {
        this.trades = storage.data;
      }
    }
  },
  methods: {
    connect() {
      this.socket = new WebSocket('ws://localhost:3000');

      this.socket.onopen = event => {
        this.$emit('connected', event);
      }

      this.socket.onmessage = event => {
        let json;

        try {
          json = JSON.parse(event.data);
        } catch (error) {}

        if (!json || !json.data || !json.data.length) {
          return;
        }

        const trades = json.data.sort((a, b) => a[1] - b[1]);

        let index;

        for (index=this.trades.length - 1; index>=0; index--) {
          if (this.trades[index][1] < trades[0][1]) {
            continue;
          }
        }

        for (let trade of trades) {
          this.trades.splice(index++, 0, trade);
        }

        this.$emit('trades', {
          exchange: json.exchange,
          data: trades
        });
      }

      this.socket.onclose = () => {
        console.log('socket onclose');
        this.$emit('disconnected');

        clearInterval(this.interval);
      }

      this.socket.onerror = err => {
        console.log('socket onerror', err);

        this.$emit('error', err);
      }
    },
    save() {
      if (localStorage) {
        localStorage.setItem('trades', JSON.stringify({
          timestamp: +new Date(),
          data: this.trades.sort((a, b) => a[1] - b[1])
        }));
      }
    },
    disconnect() {
      this.socket && this.socket.close();
    },
  }
});

export default emitter;