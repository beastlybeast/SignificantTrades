<template>
  <header class="header">
    <div class="header__title"><font-awesome-icon :icon="currencyIcon" /> {{ title }}</div>
    <button class="toggle-options" type="button" v-on:click="toggleSettings"><font-awesome-icon :icon="cogIcon" /></button>
  </header>
</template>

<script>
  import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
  import cog from '@fortawesome/fontawesome-free-solid/faCog';
  import options from '../services/options';
  
  import socket from '../services/socket';
  import helper from '../services/helper';

  export default {
    mixins: [helper],
    components: {
      FontAwesomeIcon
    },
    data() {
      return {
        title: 'SignificantTrades',
        cogIcon: cog
      }
    },
    created() {
      socket.$on('price', price => {
        window.document.title = this.title = this.formatPrice(price);
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
      background-color: rgba(white, .1);
      color: white;
      padding: 10px 14px;
      font-size: 16px;
      align-self: stretch;
      cursor: pointer;

      &:hover,
      &:active {
        background-color: #E91E63;
      }
    }
  }
</style>
