import Vue from 'vue'

import options from './options'

const emitter = new Vue({
  data() {
    return {
      url: process.env.API_URL || 'ws://localhost:3000',
      trades: [],
      exchanges: [],
      socket: null,
      connected: false,
      reconnectionDelay: 2000
    }
  },
  created() {
    this.http_url = this.url.replace(/^ws(s?)\:\/\//, 'http$1://');
  },
  methods: {
    connect() {
      if (this.socket && this.socket.readyState === 1) {
        return;
      }

      this.socket = new WebSocket(this.url);

      this.socket.onopen = event => {
        this.connected = true;

        this.$emit('connected', event);

        this.reconnectionDelay = 5000;
      }

      this.socket.onmessage = event => {
        let data = JSON.parse(event.data);

        if (!data) {
          throw new Error('Unable to read socket message');
        }

        if (Array.isArray(data) && data.length) {

          /* received message is trade data 
              => filter, sort, store and transmit to components
          */

          data = data
            .sort((a, b) => a[2] - b[2]);
          
          this.trades = this.trades.concat(data);

          this.$emit('trades', data);    

        } else if (typeof data.type) {

          /* received message is something else
              => event, alerts, updates..
          */

          switch (data.type) {
            case 'welcome':
              this.$emit('welcome', data);   

              this.exchanges = data.exchanges
                .filter(exchange => exchange.connected)
                .map(exchange => exchange.id);
              this.$emit('exchanges', this.exchanges);

              this.$emit('pair', data.pair);

              this.$emit('alert', {
                id: `server_status`,
                type: 'info',
                title: `Tracking ${data.pair}`,
                message: !this.exchanges.length ? 'No connected exchanges' : 'Through ' + this.exchanges.join(', ').toUpperCase()
              });  
            break;
            case 'pair':
              this.$emit('pair', data.pair);  

              this.$emit('alert', {
                id: `pair`,
                type: 'info',
                title: `Now tracking ${data.pair}`,
              });   
            break;
            case 'exchange_connected':
              if (options.debug) {
                this.$emit('alert', {
                  data: {
                    type: 'connected',
                    exchange: data.id,
                  },
                  id: `${data.id}_status`,
                  type: 'success',
                  message: `[${data.id}] connected`
                });
              }
              
              if (this.exchanges.indexOf(data.id) === -1)
                this.exchanges.push(data.id);

              this.$emit('exchanges', this.exchanges);
            break;
            case 'exchange_disconnected':
              if (options.debug) {
                this.$emit('alert', {
                  data: {
                    type: 'disconnected',
                    exchange: data.id,
                  },
                  id: `${data.id}_status`,
                  type: 'error',
                  message: `[${data.id}] disconnected`
                });   
              }
              
              if (this.exchanges.indexOf(data.id) !== -1)
                this.exchanges.splice(this.exchanges.indexOf(data.id), 1);

              this.$emit('exchanges', this.exchanges);
            break;
            case 'exchange_error':
              if (options.debug) {
                this.$emit('alert', {
                  type: 'error',
                  title: `[${data.id}] an error occured`,
                  id: `${data.id}_status`,
                  message: data.message
                });   
              }
            break;
          }
        }
      }

      this.socket.onclose = () => {
        if (this.connected) {
          this.connected = false;

          this.$emit('alert', {
            type: 'error',
            message: `Connection lost`,
            id: `server_status`,
          });

          this.$emit('disconnected');
        }

        this.reconnect();
      }

      this.socket.onerror = err => {
        this.$emit('alert', {
          type: 'error',
          id: `server_status`,
          message: `Couldn't reach the server`,
        });   

        this.$emit('error', err);

        this.reconnect();
      }
    },
    send(method, message) {
      if (this.socket && this.socket.readyState === 1) {
        this.socket.send(JSON.stringify({
          method: method,
          message: message
        }))
      }
    },    
    disconnect() {
      this.socket && this.socket.close();
    },
    reconnect() {
      if (this.socket && this.socket.readyState === 1) {
        return;
      }

      clearTimeout(this.reconnectionTimeout);

      this.reconnectionTimeout = setTimeout(this.connect.bind(this), this.reconnectionDelay);

      this.reconnectionDelay *= 1.25;
    },
    fetch(interval) {
      const component = this;

      fetch(this.http_url + '/history/' + interval)
        .then(res => res.json())
        .then(data => {
          this.trades = data;

          this.$emit('history');
        })
    }
  }
});

export default emitter;