<template>
  <div class="trades">
    <ul v-if="trades.length">
      <li v-for="trade in trades" class="trades__item" :key="trade.id" :class="trade.classname" :style="{ 'background-image' : trade.image ? 'url(\'' + trade.image + '\')' : 'none' }">
        <div class="trades__item__side"><font-awesome-icon :icon="trade.icon" /></div>
        <div class="trades__item__exchange">{{ trade.exchange }}</div>
        <div class="trades__item__price"><font-awesome-icon :icon="dollarSign" />{{ trade.price }}</div>
        <div class="trades__item__amount"><font-awesome-icon :icon="dollarSign" />{{ trade.amount }}</div>
        <div class="trades__item__date" :timestamp="trade.timestamp">{{ trade.date }}</div>
      </li>
    </ul>
    <div v-else class="trades__item trades__item--empty">
      Nothing to show :-(
    </div>
  </div>
</template>

<script>
  import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
  import angleUp from '@fortawesome/fontawesome-free-solid/faAngleUp';
  import angleDown from '@fortawesome/fontawesome-free-solid/faAngleDown';
  import dollarSign from '@fortawesome/fontawesome-free-solid/faDollarSign';

  import socket from '../socket';

  export default {
    components: {
      FontAwesomeIcon
    },
    data () {
      return {
        dollarSign: dollarSign,
        trades: [],
        gifs: []
      }
    },
    created() {
      this.getGifs();

      socket.$on('trades', event => {
        for (let trade of event.data) {
          let classname = [];
          let icon;
          let image;
          let amount = (trade[2] * trade[3]).toFixed(2);

          if (trade[4] === 'b') {
            classname.push('buy');
            icon = angleUp;
          } else {
            classname.push('sell');
            icon = angleDown;
          }

          if (amount >= 1000000) {
            image = this.gifs[Math.floor(Math.random() * (this.gifs.length - 1))];
            classname.push('significant');
            classname.push('1m');
            amount = (amount / 1000000).toFixed(1) + 'M';
          } else if (amount >= 100000) {
            classname.push('significant');
            amount = (amount / 1000).toFixed(1) + 'K';
          } else if (amount >= 1000) {
            amount = (amount / 1000).toFixed(1) + 'K';
          } 

          this.trades.unshift({
            id: trade[0],
            side: trade[4] === 'b' ? 'BUY' : 'SELL',
            exchange: event.exchange,
            price: trade[2].toFixed(1),
            amount: amount,
            classname: classname.map(a => 'trades__item--' + a).join(' '),
            icon: icon,
            date: this.ago(trade[1]),
            timestamp: trade[1],
            image: image
          });
        }

        this.trades.splice(100, this.trades.length);
      });
    },
    mounted() {
      this.timeAgoInterval = setInterval(() => {
        for (let element of this.$el.querySelectorAll('[timestamp]')) {
          element.innerHTML = this.ago(element.getAttribute('timestamp'));
        }
      }, 1000);
    },
    methods: {
      getGifs(refresh) {
        let storage = localStorage ? JSON.parse(localStorage.getItem('1mgifs')) : null;

        if (!refresh && storage && +new Date() - storage.timestamp < 1000 * 60 * 60) {
          this.gifs = storage.data;
        } else {
          fetch('http://api.giphy.com/v1/gifs/search?q=money&rating=r&limit=100&api_key=b5Y5CZcpj9spa0xEfskQxGGnhChYt3hi')
            .then(res => res.json())
            .then(res => {
              if (!res.data || !res.data.length) {
                return;
              }
              for (let item of res.data) {
                this.gifs.push(item.images.original.url);
              }

              if (localStorage) {
                localStorage.setItem('1mgifs', JSON.stringify({
                  timestamp: +new Date(),
                  data: this.gifs
                }));
              }
            });
        }
      },
      ago(timestamp) {
        const seconds = Math.floor((new Date() - timestamp) / 1000);
        let interval, output;

        if ((interval = Math.floor(seconds / 31536000)) > 1) 
          output = interval + 'y';
        else if ((interval = Math.floor(seconds / 2592000)) > 1) 
          output = interval + 'm';
        else if ((interval = Math.floor(seconds / 86400)) > 1) 
          output = interval + 'd';
        else if ((interval = Math.floor(seconds / 3600)) > 1) 
          output = interval + 'h';
        else if ((interval = Math.floor(seconds / 60)) > 1) 
          output = interval + 'm';
        else
          output = Math.ceil(seconds) + 's';

        return output;
      }
    }
  }
</script>

<style lang="scss">
  $green: #7CB342;
  $red: #F44336;

  .trades {
    ul {
      margin: 0;
      padding: 0;
      flex-flow: column nowrap;
    }

    .trades__item {
      display: flex;
      flex-flow: row nowrap;
      padding: 5px 7px;
      background-position: center center;
      background-size: cover;
      background-blend-mode: overlay;
      position: relative;

      &.trades__item--sell {
        background-color: lighten($red, 50%);
        color: $red;
        &.trades__item--significant {
          background-color: $red;
        }
      }

      &.trades__item--buy {
        background-color: lighten($green, 50%);
        color: $green;
        &.trades__item--significant {
          background-color: $green;
        }
      }

      &.trades__item--significant {
        color: white;
      }

      &.trades__item--1m {
        padding: 8px 7px;

        > div {
          position: relative;
        }

        &:before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          background-color: rgba(black, .1);
        }
      }

      > div {
        flex-grow: 1;
        flex-basis: 0;
        word-break: break-word;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &.trades__item__side {
          flex-grow: 0;
          flex-basis: 20px;
        }

        &.trades__item__exchange {
          flex-grow: 1.25;
        }

        &.trades__item__amount, &.trades__item__price {
          flex-grow: 1.5;
        }

        &.trades__item__date {
          text-align: right;
        }
      }
    }
  }
</style>