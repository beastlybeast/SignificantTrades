<template>
  <div id="app">
    <TradeActivity/>
    <TradeList/>
  </div>
</template>

<script>
  import TradeList from './components/TradeList.vue';
  import TradeActivity from './components/TradeActivity.vue'
  import socket from './socket';

  socket.connect();

  export default {
    components: {
      TradeList, TradeActivity
    },
    name: 'app',
    data () {
      return {
      }
    }
  }
</script>

<style lang="scss">
  body {
    margin: 0;
  }

  #app {
    width: 100%;
    overflow: hidden;

    @media only screen and (min-width: 768px) {
      width: 320px;
    }
  }
</style>
