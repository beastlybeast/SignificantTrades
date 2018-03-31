<template>
  <div id="app">
    <Settings/>
    <div class="app-wrapper">
      <Alerts/>
      <Header/>
      <TradeChart/>
      <TradeList/>
    </div>
  </div>
</template>

<script>
  import Alerts from './components/Alerts.vue';
  import Header from './components/Header.vue';
  import Settings from './components/Settings.vue';
  import TradeList from './components/TradeList.vue';
  import TradeChart from './components/TradeChart.vue';
  import socket from './services/socket';
  import options from './services/options';

  socket.connect();

  socket.$on('welcome', event => {
    options.pair = event.pair;
  });

  export default {
    components: {
      Alerts, Header, Settings, TradeList, TradeChart
    },
    name: 'app',
    created() {
      const settings = JSON.parse(localStorage.getItem('options'));

      if (settings && typeof settings === 'object') {
        for (let name of Object.keys(settings)) {
          options[name] = settings[name];
        }
      }

      window.addEventListener('beforeunload', () => {
        localStorage.setItem('options', JSON.stringify(options.$data));
      })
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
    min-height: 250px;

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

  .mt15 {
    margin-top: 15px;
  }

  .mb15 {
    margin-bottom: 15px;
  }
</style>
