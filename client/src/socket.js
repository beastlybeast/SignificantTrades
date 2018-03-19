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
    if (localStorage) {
      const storage = JSON.parse(localStorage.getItem('trades'));

      if (storage && storage.trades && +new Date() - storage.timestamp < 1000 * 60 * 60) {
        this.trades = storage.trades;

        this.$emit('trades', this.trades);
      }
    }
  },
  methods: {
    connect() {
      // console.log('connect()');
      this.socket = new WebSocket('ws://localhost:3000');

      this.socket.onopen = event => {
        // console.log('emitter emit connected');
        this.$emit('connected', event);

        this.interval = setInterval(() => {
          this.socket.send(`Message Number ${++this.count}`)
        }, 1000)
      }

      this.socket.onmessage = event => {
        if (!event || !event.type) {
          return;
        }

        // console.log('emitter emit message');

        switch (event.type) {
          case 'trades':
            this.processTrades(event);
          break;
        }
      }

      this.socket.onclose = () => {
        // console.log('emitter emit disconnected');
        this.$emit('disconnected');

        clearInterval(this.interval);
      }

      this.socket.onerror = err => {
        // console.log('emitter emit error');
        this.$emit('error', err);
      }

      this.fake();
    },
    processTrades(event) {
        if (!event.data || !event.data.length) {
          return;
        }

        const recentTrades = event.data.sort((a, b) => a[1] - b[1]);

        // console.log('recentTrades first timestamp: ', recentTrades[0][1], 'last timestamp: ', recentTrades[recentTrades.length - 1][1]);

        for (let index=this.trades.length - 1; index>=0; index--) {
          if (this.trades[index][1] < recentTrades[0][1]) {
            // console.log('use this.trade#' + index + ' (of ' + this.trades.length + ' trades)' + ' as base');
            continue;
          }
        }

        for (let trade of recentTrades) {
          this.trades.splice(index++, 0, trade);
        }

        this.save();

        this.$emit('trades', recentTrades);
    },
    save() {
      if (localStorage) {
        localStorage.setItem('trades', JSON.stringify({
          timestamp: +new Date(),
          data: this.trades
        }));
      }
    },
    disconnect() {
      // console.log('disconnect');
      this.socket && this.socket.close();
    },
    id() {
      var S4 = function() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
      };

      return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
    },
    fake() {
      // console.log('faking out...');
      const exchange = [
        'bitmex',
        'kraken',
        'binance',
        'bitfinex',
        'gdax',
        'bitstamp',
        'okcx'
      ][Math.floor(Math.random()*7)];
      if (window.stoploss) {
        return;
      }
      const trades = [];

      for (let i=0; i<Math.random()*3; i++) {
        const volume = Math.exp(Math.random() * Math.exp(Math.random() * 2));
        const side = Math.random() > .5 ? 'b' : 's';
        trades.push([this.id(), +new Date() + (i * Math.random() * 100), this.price, +volume.toFixed(5), side, 'l']);
        this.price += ((Math.random() * (side === 'b' ? 1 : -1)) * (volume / 100));
        // console.log('new this.price:', this.price);
      }

      this.trades = this.trades.concat(trades);

      this.save();

      // console.log(trades);
      this.$emit('trades', {
        exchange: exchange,
        data: trades
      });

      setTimeout(this.fake.bind(this), Math.random() * 1000);
    }
  }
});

export default emitter;