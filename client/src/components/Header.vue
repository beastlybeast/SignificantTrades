<template>
  <header class="header">
    <div class="header__title">SignificantTrades</div>
    <button class="toggle-options" type="button" v-on:click="toggleSettings"><font-awesome-icon :icon="cogIcon" /></button>
  </header>
</template>

<script>
  import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
  import cog from '@fortawesome/fontawesome-free-solid/faCog';
  import options from '../options';

  export default {
    components: {
      FontAwesomeIcon
    },
    render() {
      console.log('render header.vue');
    },
    data() {
      return {
        cogIcon: cog
      }
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
      padding: 10px;
      align-self: stretch;
      cursor: pointer;

      &:hover,
      &:active {
        background-color: #E91E63;
      }
    }
  }
</style>
