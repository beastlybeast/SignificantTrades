<template>
  <div class="settings-container" v-bind:class="{ open: opened }">
    <a href="#" class="toggle-settings" v-on:click="hideSettings"><font-awesome-icon :icon="timesIcon" /></a>
    <div class="form-group">
      <label for="option-group-by">Grouper les trades ({{options.groupBy}})</label>
      <input type="range" id="option-group-by" class="form-control" min="0" max="1000000" step="1000" v-model="options.groupBy">
    </div>
  </div>
</template>

<script>
  import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
  import times from '@fortawesome/fontawesome-free-solid/faTimes';
  import options from '../options';

  export default {
    components: {
      FontAwesomeIcon
    },
    render() {
      console.log('render settings.vue');
    },
    data() {
      return {
        timesIcon: times,
        options: options,
        opened: false
      }
    },
    created() {
      this.onopen = () => this.opened = true;
      this.onclose = () => this.opened = false;
    },
    mounted() {
      options.$on('open', this.onopen);
      options.$on('close', this.onclose);
    },
    beforeDestroy() {
      options.$off('open', this.onopen);
      options.$off('close', this.onclose);
    },
    methods: {
      hideSettings() {
        options.hide();
      }
    }
  }
</script>

<style lang="scss">
  .settings-container {
    position: absolute;
    z-index: 1;
    opacity: 0;
    visibility: hidden;
    transform: scale(1.2);
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(black, .7);
    color: white;
    padding: 20px;
    transition: all .2s, visibility .2s linear .2s;

    a {
      color: white;
    }

    .toggle-settings {
      position: absolute;
      right: 10px;
      top: 10px;
    }

    .form-group {
      > label,
      > .form-control {
        display: block;
        width: 100%;
        font-size: 12px;
      }

      > label {
        margin-bottom: 5px;
      }
    }

    &.open {
      transition: all .2s;
      visibility: visible;
      transform: none;
      opacity: 1;

      ~ .app-wrapper {
        filter: blur(10px);
      }
    }
  }
</style>
