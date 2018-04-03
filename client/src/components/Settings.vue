<template>
  <div class="settings__container" v-bind:class="{ open: opened }">
    <div class="settings__scroller">
      <a href="#" class="toggle-settings icon-times" v-on:click="hideSettings"></a>
      <div class="settings__wrapper">
        <div class="settings__column">
          <div class="form-group mb15">
            <label for="option-group-by">Pair</label>
            <input type="string" placeholder="BTCUSD" class="form-control" v-model="options.pair" @change="switchPair">
          </div>
          <div class="form-group mb15">
            <label for="option-group-by">MA length</label>
            <input type="number" min="0" max="100" step="1" class="form-control" v-model="options.averageLength">
          </div>
        </div>
        <div class="settings__column">
          <div class="form-group mb15">
            <label for="option-group-by">Stack trades ({{options.groupBy}})</label>
            <input type="number" min="0" max="10000000" step="10000" class="form-control" v-model="options.groupBy">
          </div>
          <div class="form-group mb15">
            <label for="option-group-by">Max rows</label>
            <input type="number" min="0" max="1000" step="1" class="form-control" v-model="options.maxRows">
          </div>
        </div>
        <div class="form-group mb15">
          <label>Filter exchanges ({{ options.exchanges.length}} selected)</label>
          <div class="settings__exchanges">
            <a v-for="(exchange, index) in exchanges" v-bind:key="index"
              class="settings__exchanges__item"
              href="#"
              v-on:click="options.toggleExchange(exchange)"
              v-bind:class="{'settings__exchanges__item--active': options.exchanges.indexOf(exchange) !== -1}">
              {{ exchange }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import options from '../services/options';
  import socket from '../services/socket';

  export default {
    data() {
      return {
        exchanges: [],
        options: options,
        opened: false
      }
    },
    created() {
      socket.$on('exchanges', exchanges => {
        this.exchanges = exchanges;
      });

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
      },
    }
  }
</script>

<style lang="scss">
	@import '../assets/sass/variables';

  .settings__container {
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

    .settings__scroller {
      max-height: 100%;
      overflow: auto;
      transform: scale(1.2);
      opacity: 0;
      transition: all .2s $easeOutExpo;

      .settings__wrapper {
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
      font-size: 24px;
      opacity: .2;

      &:hover {
        opacity: 1;
      }
    }

    .settings__column {
      display: flex;

      > div {
        margin-right: 16px;
        flex-grow: 1;
        flex-basis: 50%;
        max-width: calc(50% - 8px);

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

    .settings__exchanges {
      .settings__exchanges__item {
        padding: 5px 8px;
        background-color: black;
        color: white;
        opacity: .3;
        transition: all .2s $easeOutExpo;
        border-radius: 2px;
        margin-right: 2px;
        margin-bottom: 3px;
        display: inline-block;

        &.settings__exchanges__item--active {
          background-color: $green;
          opacity: 1;
        }
      }
    }

    &.open {
      transition: all .3s $easeOutExpo;
      visibility: visible;
      transform: none;
      background-color: rgba(black, .5);
      pointer-events: auto;

      .settings__scroller {
        transition: all .3s $easeOutExpo .2s;
        transform: none;
        opacity: 1;
      }

      ~ .app-wrapper {
        filter: blur(10px);
        transform: scale(1.25);
      }
    }
  }
</style>
