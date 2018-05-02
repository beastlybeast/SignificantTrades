<template>
  <div class="app">
    <form onSubmit={this.onSubmit}>
      <input
        type="text"
        v-model="symbol"
        @keypress="onKeyPress"
        class="symbol-input"
        placeholder="Enter symbol here..."
        autofocus
      />
      <input
        type="number"
        v-model="minPrice"
        class="price-input"
        placeholder="Min order size threshold..."
        min="0"
        @keypress="onKeyPress"
      />
    </form>
    <table class="streaming-table">
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Price</th>
          <th>Size</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in data"
          :key="index"
          :class="{
            'streaming-list-row': true,
            dark: item.size > 99999,
            sell: item.side && item.side.toLowerCase() === 'sell',
            buy: item.side && item.side.toLowerCase() === 'buy',
          }"
        >
          <td width="20%">{{ item.symbol }}</td>
          <td width="20%">{{ item.price }}</td>
          <td width="20%">{{ item.size }}</td>
          <td width="40%">{{ item.timestamp }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
export default {
  name: 'HelloWorld',
  data () {
    return {
      msg: 'Welcome to Your Vue.js App',
      data: [],
      symbol: '',
      minPrice: 5000,
      socket: null,
    }
  },

  mounted () {
    this.initWebSocketClient(this.symbol, this.minPrice)
  },

  methods: {
    onKeyPress (e) {
      if (e.key !== 'Enter') {
        return
      }
      this.data = []
    },

    initWebSocketClient(symbol, price) {
      if (symbol == null) {
        return null
      }

      const vm = this
      const priceFilter = isNaN(price) ? 0 : price
      let streamingData = null

      if (vm.socket) {
        vm.socket.close()
        vm.socket = null
      }

      vm.socket = new WebSocket(`wss://www.bitmex.com/realtime?subscribe=trade:${symbol.toUpperCase()}`)

      vm.socket.onmessage = (event) => {
        console.log(JSON.parse(event.data).data)

        const response = JSON.parse(event.data)

        if (response && response.data && response.data.length) {
          response.data.forEach((item) => {
            if (item.size >= priceFilter) {
              const data = vm.data.reverse()

              data.push(item)
              vm.data = data.reverse()
            }
          })
        }
       }
    }
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.app {
  margin: 0 auto;
  width: 700px;
}
.streaming-table {
  background-color: rgba(0, 0, 0, 0);
  border-collapse: collapse;
  border-spacing: 0;
  font-family: 'Open Sans', sans-serif;
  font-size: 20px;
}
.streaming-table .streaming-list-row td {
  padding: 5px;
  white-space: nowrap;
  border-left: 1px solid #ddd;
  text-align: right;
}
.streaming-list-row {
  border-top: 1px solid #bbb;
}
.streaming-table .buy {
  color: #4aa165;
}
.streaming-table tr.dark.buy {
  color: white;
  background-color: #4aa165;
}
.streaming-table .sell {
  color: #d16547;
}
.streaming-table tr.dark.sell {
  color: white;
  background-color: #d16547;
}
.streaming-list-row:nth-child(odd) {
  background: rgba(195,195,195,0.25);
}
.streaming-list-row:nth-child(even) {
  background: #fff;;
}
.symbol-input {
  width: 120px;
  font-size: 20px;
  margin-right: 5px;
  border: none;
  border-bottom: 1px solid aquamarine;
}
.price-input {
  font-size: 20px;
  width: 170px;
  margin-right: 5px;
  border: none;
  border-bottom: 1px solid aquamarine;
}
</style>
