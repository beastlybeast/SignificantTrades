import Vue from 'vue'

import options from './options'

const emitter = new Vue({
  data() {
    return {
      trades: [],
      socket: null,
      connected: false,
      reconnectionDelay: 5000
    }
  },
  methods: {
    connect() {
      if (this.socket && this.socket.readyState === 1) {
        return;
      }

      this.socket = new WebSocket(process.env.API_URL || 'ws://localhost:3000');

      this.socket.onopen = event => {
        this.connected = true;

        this.$emit('connected', event);

        this.reconnectionDelay = 5000;
      }

      this.socket.onmessage = event => {
        let data = JSON.parse(event.data);

        const excluded = options.excluded;

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

              const actives = data.exchanges
                .filter(exchange => exchange.connected)
                .map(exchange => exchange.id);
              this.$emit('exchanges', actives);

              this.$emit('pair', data.pair);

              this.$emit('alert', {
                type: 'info',
                title: `Tracking ${data.pair}`,
                message: !actives.length ? 'No connected exchanges' : 'Through ' + actives.join(', ').toUpperCase()
              });  
            break;
            case 'pair':
              this.$emit('pair', data.pair);  

              this.$emit('alert', {
                type: 'info',
                title: `Now tracking ${data.pair}`,
              });   
            break;
            case 'exchange_connected':
              this.$emit('alert', {
                data: {
                  type: 'connected',
                  exchange: data.id,
                },
                id: `${data.id}_connected`,
                type: 'success',
                message: `[${data.id}] connected`
              });   
            break;
            case 'exchange_disconnected':
              this.$emit('alert', {
                data: {
                  type: 'disconnected',
                  exchange: data.id,
                },
                type: 'error',
                message: `[${data.id}] disconnected`
              });   
            break;
            case 'exchange_error':
              this.$emit('alert', {
                type: 'error',
                title: `[${data.id}] an error occured`,
                message: data.message
              });   
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
          });

          this.$emit('disconnected');
        }

        this.reconnect();
      }

      this.socket.onerror = err => {
        console.log('socket error', err);

        this.$emit('alert', {
          type: 'error',
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

      this.reconnectionDelay *= 2;
    }
  }
});

export default emitter;