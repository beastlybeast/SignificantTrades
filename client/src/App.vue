<template>
  <div id="app">
    <Settings/>
    <div class="app-wrapper">
      <Header/>
      <TradeActivity/>
      <TradeList/>
    </div>
  </div>
</template>

<script>
  import Header from './components/Header.vue';
  import Settings from './components/Settings.vue';
  import TradeList from './components/TradeList.vue';
  import TradeActivity from './components/TradeActivity.vue';
  import socket from './socket';
  import options from './options';

  socket.connect();

  export default {
    components: {
      Header, Settings, TradeList, TradeActivity
    },
    name: 'app',
    render() {
      console.log('render app.vue');
    },
    data () {
      return {
        options: options,
      }
    }
  }
</script>

<style lang="scss">
  body {
    margin: 0;
    font-family: 'Roboto', sans-serif;
  }

  #app {
    width: 100%;
    overflow: hidden;
    position: relative;

    @media only screen and (min-width: 768px) {
      width: 320px;
    }
  }

  *:focus {
    outline: none;
  }

  a {
    text-decoration: none;
  }
</style>
