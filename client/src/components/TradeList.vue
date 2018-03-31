<template>
  <div class="trades">
    <ul v-if="trades.length">
      <li v-for="trade in trades" class="trades__item" :key="trade.id" :class="trade.classname" :style="{ 'background-image' : trade.image ? 'url(\'' + trade.image + '\')' : 'none' }">
        <div class="trades__item__side"><font-awesome-icon :icon="trade.icon" /></div>
        <div class="trades__item__exchange">{{ trade.exchange }}</div>
        <div class="trades__item__price"><font-awesome-icon :icon="currencyIcon" /> {{ trade.price }}</div>
        <div class="trades__item__amount">
          <span class="trades__item__amount__fiat"><font-awesome-icon :icon="currencyIcon" /> {{ trade.amount }}</span>
          <span class="trades__item__amount__coin"><font-awesome-icon :icon="commodityIcon" /> {{ trade.size }}</span>
        </div>
        <div class="trades__item__date" :timestamp="trade.timestamp">{{ trade.date }}</div>
      </li>
    </ul>
    <div v-else class="trades__item trades__item--empty">
      Nothing to show, yet.
    </div>
  </div>
</template>

<script>
  import FontAwesomeIcon from '@fortawesome/vue-fontawesome';
  import angleUp from '@fortawesome/fontawesome-free-solid/faAngleUp';
  import angleDown from '@fortawesome/fontawesome-free-solid/faAngleDown';

  import options from '../services/options';
  import socket from '../services/socket';

  import helper from '../services/helper';

  export default {
    mixins: [helper],
    components: {
      FontAwesomeIcon
    },
    data () {
      return {
        ticks: {},
        trades: [],
        gifs: [],
      }
    },
    created() {
      this.getGifs();

      socket.$on('trades', trades => {
        for (let trade of trades) {
          if (options.groupBy) {
            if (this.ticks[trade[0]]) {
              if (+new Date() - this.ticks[trade[0]][2] > 5000) {
                delete this.ticks[trade[0]];
              } else {
                this.ticks[trade[0]][3] = (this.ticks[trade[0]][3] * this.ticks[trade[0]][4] + trade[3] * trade[4]) / 2 / ((this.ticks[trade[0]][4] + trade[4]) / 2);
                this.ticks[trade[0]][4] += trade[4];

                if (this.ticks[trade[0]][3] * this.ticks[trade[0]][4] >= options.groupBy) {
                  this.appendTrade(this.ticks[trade[0]]);
                  delete this.ticks[trade[0]];
                }

                continue;
              }
            }

            if (!this.ticks[trade[0]] && trade[3] * trade[4] < options.groupBy) {
              this.ticks[trade[0]] = trade;
              continue;
            }
          }

          this.appendTrade(trade);
        }

        this.trades.splice(+options.maxRows || 20, this.trades.length);
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
      appendTrade(trade) {
        let classname = [];
        let icon;
        let image;
        let amount = (trade[3] * trade[4]).toFixed(2);

        if (trade[5]) {
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
          id: trade[1],
          side: trade[5] ? 'BUY' : 'SELL',
          size: trade[4].toFixed(5),
          exchange: trade[0],
          price: trade[3].toFixed(2),
          amount: amount,
          classname: classname.map(a => 'trades__item--' + a).join(' '),
          icon: icon,
          date: this.ago(trade[2]),
          timestamp: trade[2],
          image: image
        });
      },
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
  @import '../assets/variables';

  .trades {
    ul {
      margin: 0;
      padding: 0;
      display: flex;
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

      &.trades__item--empty {
        justify-content: center;
        padding: 20px;
        font-size: 80%;
      }

      &.trades__item--sell {
        background-color: lighten($red, 35%);
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

        &.trades__item__amount {
          > span {
            position: absolute;
            transition: all .1s ease-in-out;

            &.trades__item__amount__coin {
              transform: translateX(25%);
              opacity: 0;
            }
          }

          &:hover {
            > span.trades__item__amount__coin {
              transform: none;
              opacity: 1;
            }

            > span.trades__item__amount__fiat {
              transform: translateX(-25%);
              opacity: 0;
            }
          }
        }

        &.trades__item__date {
          text-align: right;
        }
      }
    }
  }
</style>