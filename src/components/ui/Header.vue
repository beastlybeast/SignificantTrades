<template>
  <header id="header" class="header">
    <div class="header__wrapper">
      <div class="header__title">
        <span class="pair" v-if="pair">{{ pair }}</span>
        &nbsp;
        <span class="icon-quote"></span>
        &nbsp;
        <span v-html="price || 'SignificantTrades'"></span>
      </div>
      <button type="button" @click="$store.commit('app/TOGGLE_SEARCH', !showSearch)" title="Search" v-tippy="{ placement: 'bottom' }">
        <span class="icon-search"></span>
      </button>
      <dropdown
        v-if="showChart"
        :options="timeframes"
        :selected="timeframe"
        placeholder="tf."
        @output="$store.commit('settings/SET_TIMEFRAME', +$event)"
      ></dropdown>
      <button type="button" v-if="!isPopupMode" @click="togglePopup" title="Open as popup" v-tippy="{ placement: 'bottom' }">
        <span class="icon-external-link"></span>
      </button>
      <button type="button" :class="{ active: useAudio }" @click="$store.commit('settings/TOGGLE_AUDIO', !useAudio)">
        <span class="icon-volume-muted"></span>
      </button>
      <button type="button" @click="$emit('toggleSettings')">
        <span class="icon-cog"></span>
      </button>
    </div>
  </header>
</template>

<script>
import { mapState } from 'vuex'
import { ago } from '../../utils/helpers'

export default {
  props: ['price'],
  data() {
    return {
      fetchLabel: 'Fetch timeframe',
      isPopupMode: window.opener !== null,
      showTimeframeDropdown: false,
      timeframeLabel: '15m',
      timeframes: {}
    }
  },
  computed: {
    ...mapState('settings', ['pair', 'useAudio', 'showChart', 'timeframe']),
    ...mapState('app', ['showSearch'])
  },
  created() {
    this._fetchLabel = this.fetchLabel.substr()

    const now = +new Date()

    ;[1, 3, 5, 10, 15, 30, 60, 60 * 3, 60 * 5, 60 * 15].forEach(span => (this.timeframes[span] = ago(now - span * 1000)))

    this.updateTimeframeLabel()
  },
  methods: {
    setTimeframe(timeframe) {
      document.activeElement.blur()

      this.updateTimeframeLabel(timeframe)

      setTimeout(() => {
        this.$store.commit('settings/SET_TIMEFRAME', timeframe)
      }, 50)
    },
    updateTimeframeLabel(timeframe) {
      this.timeframeLabel = ago(+new Date() - (timeframe || this.timeframe) * 1000)
    },
    togglePopup() {
      window.open(window.location.href, `sig${this.pair}`, 'toolbar=no,status=no,width=350,height=500')

      setTimeout(() => {
        window.close()
      }, 500)
    }
  }
}
</script>

<style lang="scss">
header#header {
  background-color: lighten($dark, 10%);
  color: white;
  position: relative;

  div.header__wrapper {
    position: relative;
    display: flex;
    align-items: center;

    > button,
    .dropdown__selected {
      padding: 0.2em 0.4em;
      font-size: 1em;

      @media screen and (min-width: 480px) {
        padding: 0.2em 0.6em;
      }
    }

    .dropdown__option {
      span {
        margin-right: 1em;
      }
    }
  }

  .header__title {
    width: 100%;
    padding: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    .pair {
      opacity: 0.5;
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

  .dropdown {
    .options {
      position: absolute;
    }
  }

  button {
    border: 0;
    background: none;
    color: inherit;
    position: relative;
    color: white;

    align-self: stretch;
    cursor: pointer;

    > span {
      display: inline-block;
      transition: all 0.5s $easeElastic;
    }

    .icon-play {
      opacity: 0.2;
    }

    .icon-volume-muted {
      transform: scale(1.2);
    }

    &:hover,
    &:active,
    &.active {
      .icon-external-link {
        transform: rotateZ(-7deg) scale(1.2) translate(5%, -5%);
        text-shadow: 0 0 20px $orange, 0 0 2px white;
      }

      .icon-play {
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

      .icon-volume-muted {
        color: white;
        transform: rotateZ(-7deg) scale(1.3);
        text-shadow: 0 0 20px $blue, 0 0 2px $blue;
      }
    }

    &.active {
      .icon-play {
        opacity: 1;
        color: $red;
        transform: rotateZ(-7deg) scale(1.2) translateX(10%);
        text-shadow: 0 0 20px $red, 0 0 2px $red;
      }

      .icon-volume-muted {
        &:before {
          content: unicode($icon-volume);
        }
      }

      .icon-history {
        color: white;
        text-shadow: 0 0 20px white, 0 0 2px white;
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
    transition: background-color 0.4s $easeOutExpo;
  }
}

#app.loading header#header {
  &:before {
    background-color: lighten($dark, 15%);
    animation: indeterminate-loading-bar-slow 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
  }

  &:after {
    background-color: lighten($dark, 15%);
    animation: indeterminate-loading-bar-fast 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
    animation-delay: 1.15s;
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
