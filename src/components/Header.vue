<template>
	<header id="header" class="header" v-bind:class="{ loading: isLoading }">
    <div class="header__wrapper">
      <div class="header__title"> <span class="pair" v-if="pair">{{pair}}</span> <span class="icon-currency"></span> <span v-html="price || 'SignificantTrades'"></span></div>
      <button></button>
      <button type="button" class="header__timeframe" v-bind:title="fetchLabel" v-tippy="{placement: 'left'}">
        {{timeframeLabel}}
        <ul class="dropdown">
          <li @click="setTimeframe(1000 * 10)">10s</li>
          <li @click="setTimeframe(1000 * 30)">30s</li>
          <li @click="setTimeframe(1000 * 60)">1m</li>
          <li @click="setTimeframe(1000 * 60 * 5)">5m</li>
          <li @click="setTimeframe(1000 * 60 * 15)">15m</li>
        </ul>
      </button>
      <button type="button" v-if="!isPopupMode" v-on:click="togglePopup" title="Open as popup" v-tippy="{placement: 'bottom'}"><span class="icon-external-link"></span></button>
      <button type="button" v-on:click="$store.commit('toggleSnap', !isSnaped)" v-bind:title="isSnaped ? 'Disable auto snap' : 'Auto snap chart to the latest candle'" v-tippy="{placement: 'bottom'}"><span class="icon-play" v-bind:class="{snaped: isSnaped}"></span></button>
      <button type="button" v-on:click="$emit('toggleSettings')"><span class="icon-cog"></span></button>
    </div>
	</header>
</template>

<script>
import { mapState } from 'vuex';

import socket from '../services/socket';

export default {
  props: [
    'price'
  ],
  data() {
    return {
      pair: '',
      fetchLabel: 'Fetch timeframe',
      isPopupMode: window.opener !== null,
      canFetch: false,
      showTimeframeDropdown: false,
      timeframeLabel: '15m',
      isLoading: false
    };
  },
  computed: {
    ...mapState([
      'showChart',
      'isSnaped',
      'timeframe',
		])
  },
  created() {
    this._fetchLabel = this.fetchLabel.substr();
    this.canFetch = socket.canFetch();

    socket.$on('pairing', (pair, canFetch) => {
      this.pair = pair;

      this.canFetch = canFetch && this.showChart;
    });
    
    socket.$on('fetchStart', () => {
      this.isLoading = true;
    });

    socket.$on('fetchEnd', () => {
      this.isLoading = false;
    });

    socket.$on('fetchProgress', event => {
      if (!event || isNaN(event.progress)) {
        return;
      }

      this.fetchLabel = !Math.floor(this.dashoffset)
        ? this._fetchLabel
        : this.sizeOf(event.loaded);
    });

    this.updateTimeframeLabel();
  },
  methods: {
    setTimeframe(timeframe) {
      document.activeElement.blur();

      this.updateTimeframeLabel(timeframe);
      
      this.$store.commit('setTimeframe', timeframe);
    },
    updateTimeframeLabel(timeframe) {
      this.timeframeLabel = this.$root.ago(+new Date() - (timeframe || this.timeframe));
    },
    togglePopup() {
      window.open(
        window.location.href,
        'Hey hey hey',
        'toolbar=no,status=no,width=350,height=500'
      );

      setTimeout(() => {
        window.close();
      }, 500);
    },
    sizeOf(bytes) {
      var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

      if (bytes == 0) return '0 Byte';

      var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

      return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
    }
  }
};
</script>

<style lang="scss">
@import "../assets/sass/variables";

header.header {
  color: white;
  background-color: #03A9F4;
  position: relative;

  div.header__wrapper {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
  }

  .header__title {
    width: 100%;
    padding: 10px;

    .pair {
      opacity: .5;
    }

    sup {
      line-height: 0;
      opacity: 0.5;

      span {
        font-size: 80%;
        margin-left: 2px;
      }
    }
  }

  button {
    border: 0;
    background: none;
    color: inherit;
    padding: 6px 10px 5px;
    font-size: 20px;
    position: relative;

    align-self: stretch;
    cursor: pointer;

    &.header__timeframe {
      font-size: 16px;
      font-family: monospace;
    }

    .dropdown {
      display: none;
      position: absolute;
      top: 3.5em;
      right: 0em;
      border-radius: 2px;
      font-size: 14px;
      text-align: right;
      min-width: 5em;
      margin: 0;
      background-color: $green;
      color: white;
      padding: 0;
      animation: .4s $easeOutExpo appear-from-above;
      z-index: 10001;
      max-height: 200px;
      overflow: auto;

      @keyframes appear-from-above {
        0% {
          -webkit-transform: translateY(-20%);
          transform: translateY(-20%);
          opacity: 0;
        }
        100% {
          -webkit-transform: translateY(0);
          transform: translateY(0);
          opacity: 1;
        }
      }

      > li {
        list-style: none;
        background-color: rgba(white, .05);
        padding: .5em 1em;

        transition: background-color .2s $easeOutExpo;

        &:nth-child(odd) {
          background-color: rgba(white, .1);
        }

        &:hover {
          background-color: rgba(white, .2);
        }
      }
    }

    &:focus .dropdown {
      display: block;
    }

    > span {
      display: inline-block;
      transition: all 0.5s $easeElastic;
    }

    .icon-play {
      opacity: 0.2;

      &.snaped {
        opacity: 1;
        color: $red;
        transform: rotateZ(-7deg) scale(1.2) translateX(10%);
        text-shadow: 0 0 20px $red, 0 0 2px $red;
      }
    }

    &:hover,
    &:active {
      .icon-external-link {
        transform: rotateZ(-7deg) scale(1.2) translate(5%, -5%);
        text-shadow: 0 0 20px $orange, 0 0 2px white;
      }

      .icon-play:not(.snaped) {
        opacity: 1;
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

  &:after,
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    display: block;
    background-clip: padding-box;
    transition: background-color .4s $easeOutExpo;
  }

  &.loading {
    &:before {
      background-color: rgba(black, .2);
      animation: indeterminate-loading-bar-slow 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
    }

    &:after {
      background-color: rgba(black, .2);
      animation: indeterminate-loading-bar-fast 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
      animation-delay: 1.15s;
    }
  }
}

@keyframes indeterminate-loading-bar-slow {
  0% {
    left: -35%;
    right: 100%;
  }

  60% {
    left: 100%;
    right: -90%;
  }

  100% {
    left: 100%;
    right: -90%;
  }
}

@keyframes indeterminate-loading-bar-fast {
  0% {
    left: -200%;
    right: 100%;
  }

  60% {
    left: 107%;
    right: -8%;
  }

  100% {
    left: 107%;
    right: -8%;
  }
}
</style>
