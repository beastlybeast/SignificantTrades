<template>
  <header class="header">
    <div class="header__title"><span class="icon-currency"></span> <span v-html="title"></span></div>
    <button type="button" v-if="!isPopupMode" v-on:click="togglePopup" title="Open as popup" v-tippy="{placement: 'bottom'}"><span class="icon-external-link"></span></button>
    <button type="button" v-on:click="retrieveChart" title="Load chart history" v-tippy="{placement: 'bottom'}">
      <svg class="loader" v-bind:class="{loading: fetchProgress > 0}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14">
        <path :stroke-dashoffset="fetchProgress" d="M7,1a6.06,6.06,0,0,1,6,6,6.06,6.06,0,0,1-6,6A6.06,6.06,0,0,1,1,7,6.06,6.06,0,0,1,7,1Z"/>
      </svg>
      <span class="icon-history"></span>
    </button>
    <button type="button" v-bind:title="following ? 'Stop live mode' : 'Go live mode'" v-tippy="{placement: 'bottom'}"><span class="icon-play" v-on:click="toggleFollowing" v-bind:class="{following: following}"></span></button>
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
        fetchProgress: 0,
        following: true,
        isPopupMode: window.opener !== null
      }
    },
    created() {
      options.$on('following', state => this.following = state);

      socket.$on('fetchProgress', progress => {
        if (isNaN(progress)) {
          return;
        }

        this.fetchProgress = (1 - progress) * 40;
      })

      socket.$on('price', (price, direction) => {
        if (typeof price === 'number') {
          this.title = formatPrice(price);

          window.document.title = this.title.replace(/<\/?[^>]+(>|$)/g, '');
        }
        
        if (direction) {
          let favicon = document.getElementById('favicon');

          if (!favicon || favicon.getAttribute('direction') !== direction) {
            if (favicon) {
              document.head.removeChild(favicon);
            }

            favicon = document.createElement('link');
            favicon.id = 'favicon';
            favicon.rel = 'shortcut icon';
            favicon.href = `static/${direction}.png`;

            favicon.setAttribute('direction', direction);
            
            document.head.appendChild(favicon);
          }
        }
      });
    },
    methods: {
      toggleSettings() {
        options.toggle();
      },
      retrieveChart() {
        if (this.fetchProgress) {
          return;
        }

        const interval = parseInt(window.prompt(`Load last "x" minutes`, 60));

        if (interval > 1) {
          socket.fetch(interval)
            .then(data => {
              this.fetchProgress = 0;
            })
        }
      },
      toggleFollowing() {
        options.follow(!this.following);
      },
      togglePopup() {
        window.open(window.location.href, 'Hey hey hey', 'toolbar=no,status=no,width=350,height=500');

        setTimeout(() => {
          window.close();
        }, 500);
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
      position: relative;

      align-self: stretch;
      cursor: pointer;

      > span {
        display: inline-block;
        transition: all .5s $easeElastic;
      }

      svg.loader {
        width: 100%;
        position: absolute;
        transform: scale(0);
        visibility: hidden;
        top: 0;
        left: 0;
        padding: 9px;
        width: calc(100% - 19px);
        transition: transform 1s $easeOutExpo, visibility .2s linear 1s;

        path {
          fill: none;
          stroke: white;
          stroke-linecap: round;
          stroke-width: 2px;
          stroke-dasharray: calc(6.9 * 3.142 * 1.85);
        }
        
        &.loading {
          visibility: visible;
          transition: transform .2s $easeElastic;
          transform: scale(0.9);

          + span {
            opacity: .25;
            transform: scale(1.25);
          }
        }
      }

      .icon-play {
        opacity: .2;

        &.following {
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
          text-shadow: 0 0 20px $yellow, 0 0 2px white;
        }
        
        .icon-play:not(.following) {  
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
  }
</style>
