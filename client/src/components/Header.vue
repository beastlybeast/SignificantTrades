<template>
  <header class="header">
    <div class="header__title"><span class="icon-currency"></span> <span v-html="title"></span></div>
    <button type="button" v-on:click="goLive" title="Stick view on the right"><span class="icon-play"></span></button>
    <button type="button" v-on:click="retrieveChart" title="Load previous trades"><span class="icon-history"></span></button>
    <button type="button" v-on:click="toggleSettings"><span class="icon-cog"></span></button>
  </header>
</template>

<script>
  import options from '../services/options';
  import socket from '../services/socket';

  export default {
    data() {
      return {
        title: 'SignificantTrades',
      }
    },
    created() {
      socket.$on('price', price => {
        this.title = formatPrice(price);
        
        window.document.title = this.title.replace(/<\/?[^>]+(>|$)/g, '');
      });
    },
    methods: {
      toggleSettings() {
        options.toggle();
      },
      retrieveChart() {
        const interval = parseInt(window.prompt(`How much data ? (minutes)`, 60));

        if (interval > 1) {
          socket.fetch(interval);
        }
      },
      goLive() {
        options.follow();
      }
    }
  }
</script>

<style lang="scss">
	@import '../assets/sass/variables';
  
  header.header {
    display: flex;
    background-color: #222;
    color: white;
    align-items: center;

    .header__title {
      width: 100%;
      padding: 10px;
    }

    button {
      border: 0;
      background: none;
      color: white;
      padding: 6px 10px 5px;
      font-size: 20px;

      align-self: stretch;
      cursor: pointer;

      > span {
        display: inline-block;
        transition: all .5s $easeElastic;
      }

      &:hover,
      &:active {
        .icon-play {          
          transform: rotateZ(-7deg) scale(1.2) translateX(10%);
          text-shadow: 0 0 20px $blue, 0 0 2px white;
        }

        .icon-cog {          
          transform: rotateZ(180deg) scale(1.2);
          text-shadow: 0 0 20px $green, 0 0 2px white;
        }

        .icon-history {
          transform: rotateZ(-360deg) scale(1.1);
          display: inline-block;
          text-shadow: 0 0 20px $red, 0 0 2px white;
        }
      }
    }
  }
</style>
