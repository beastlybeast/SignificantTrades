<template>
  <div class="settings-container" v-bind:class="{ open: opened }">
    <div class="settings-scroller">
      <a href="#" class="toggle-settings" v-on:click="hideSettings"><font-awesome-icon :icon="timesIcon" /></a>
      <div class="settings-wrapper">
        <div class="form-group mb15">
          <label for="option-group-by">Pair</label>
          <input type="string" placeholder="BTCUSD" class="form-control" v-model="options.pair" @change="switchPair">
        </div>
        <div class="settings-column">
          <div class="form-group mb15">
            <label for="option-group-by">Stack trades ({{options.groupBy}})</label>
            <input type="number" min="0" max="10000000" step="10000" class="form-control" v-model="options.groupBy">
          </div>
          <div class="form-group mb15">
            <label for="option-group-by">Max rows</label>
            <input type="number" min="0" max="1000" step="1" class="form-control" v-model="options.maxRows">
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
  import times from '@fortawesome/fontawesome-free-solid/faTimes';

  import options from '../services/options';
  import socket from '../services/socket';

  export default {
    components: {
      FontAwesomeIcon
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
      },
      switchPair(event) {
        socket.send('pair', this.options.pair);
      }
    }
  }
</script>

<style lang="scss">
	@import '../assets/variables';

  .settings-container {
    position: absolute;
    z-index: 1;
    visibility: hidden;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    color: white;
    transition: all .8s $easeOutExpo .2s, visibility .1s linear 1.5s;
    pointer-events: none;

    .settings-scroller {
      max-height: 100%;
      overflow: auto;
      transform: scale(1.2);
      opacity: 0;
      transition: all .2s $easeOutExpo;

      .settings-wrapper {
        padding: 20px;
      }
    }

    a {
      color: white;
    }

    .toggle-settings {
      position: absolute;
      right: 5px;
      top: 2px;
      line-height: 1px;
      font-size: 24px;
      opacity: .2;
      
      &:hover {
        opacity: 1;
      }
    }

    .settings-column {
      display: flex;

      > div {
        margin-right: 16px;
        flex-grow: 1;
        flex-basis: 50%;

        &:last-child {
          margin: 0;
        }
      }
    }

    .form-group {
      font-size: 12px;
      display: flex;
      flex-direction: column;

      .form-control {
        padding: 10px 12px;
        background-color: white;
        border-radius: 2px;
        border: 0;
      }

      > label {
        margin-bottom: 5px;
      }
    }

    &.open {
      transition: all .3s $easeOutExpo;
      visibility: visible;
      transform: none;
      background-color: rgba(black, .7);
      pointer-events: auto;

      .settings-scroller {
        transition: all .3s $easeOutExpo .2s;
        transform: none;
        opacity: 1;
      }

      ~ .app-wrapper {
        filter: blur(10px);
      }
    }
  }
</style>
