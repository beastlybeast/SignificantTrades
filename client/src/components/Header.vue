<template>
  <header class="header">
    <div class="header__title"><span class="icon-currency"></span> <span v-html="title"></span></div>
    <button class="toggle-options" type="button" v-on:click="toggleSettings"><span class="icon-cog"></span></button>
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
        options.show();
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

      .icon-cog {
        transition: all .2s $easeOutExpo;
        display: inline-block;
      }

      &:hover,
      &:active {
        .icon-cog {
          transition: transform .2s $easeOutExpo, text-shadow 5s $easeOutExpo;
          
          transform: rotateZ(180deg) scale(1.2);
          text-shadow: 0 0 5px rgba(white, .5), 0 0 20px rgba(white, .2);
        }
      }
    }
  }
</style>
