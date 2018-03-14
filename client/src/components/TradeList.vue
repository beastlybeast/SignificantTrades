<template>
  <div class="tradelist">
    <ul v-if="trades.length">
      <li v-for="trade in trades" class="tradelist__item" :key="trade.id">
        <div class="tradelist__item__side">{{ trade.side }}</div>
        <div class="tradelist__item__exchange">{{ trade.exchange }}</div>
        <div class="tradelist__item__price">{{ trade.price }}</div>
        <div class="tradelist__item__amount">{{ trade.amount }}</div>
        <div class="tradelist__item__date">{{ trade.date }}</div>
      </li>
    </ul>
    <div class="tradelist__item tradelist__item--empty">
      Nothing to show :-(
    </div>
  </div>
</template>

<script>
  export default {
    data () {
      return {
        trades: []
      }
    },
    methods: {
      clear() {
        this.trades = [];
      }
    }
  }
</script>