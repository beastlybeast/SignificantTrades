<template>
  <div class="trades">
    <ul v-if="trades.length">
      <li v-for="trade in trades" class="trades__item" :key="trade.exchange + trade.timestamp" :class="trade.classname" :style="{ 'background-image' : trade.image ? 'url(\'' + trade.image + '\')' : 'none' }">
        <div class="trades__item__side icon-side"></div>
        <div class="trades__item__exchange">{{ trade.exchange }}</div>
        <div class="trades__item__price"><span class="icon-currency"></span> <span v-html="trade.price"></span></div>
        <div class="trades__item__amount">
          <span class="trades__item__amount__fiat"><span class="icon-currency"></span> <span v-html="trade.amount"></span></span>
          <span class="trades__item__amount__coin"><span class="icon-commodity"></span> <span v-html="trade.size"></span></span>
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
  import options from '../services/options';
  import socket from '../services/socket';

  export default {
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

          // group by [exchange name + buy=1/sell=0] (ex bitmex1)
          const tid = trade[0] + trade[4]; 

          if (options.exchanges.indexOf(trade[0]) === -1) {
            return;
          }

          if (options.groupBy) {
            if (this.ticks[tid]) {
              if (+new Date() - this.ticks[tid][2] > 5000) {
                delete this.ticks[tid];
              } else {

                // average group prices
                this.ticks[tid][2] = (this.ticks[tid][2] * this.ticks[tid][3] + trade[2] * trade[3]) / 2 / ((this.ticks[tid][3] + trade[3]) / 2);
                
                // sum volume
                this.ticks[tid][3] += trade[3];

                if (this.ticks[tid][2] * this.ticks[tid][3] >= options.groupBy) {
                  this.appendTrade(this.ticks[tid]);
                  delete this.ticks[tid];
                }

                continue;
              }
            }

            if (!this.ticks[tid] && trade[2] * trade[3] < options.groupBy) {
              this.ticks[tid] = trade;
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
        let amount = trade[2] * trade[3];

        if (trade[4]) {
          classname.push('buy');
        } else {
          classname.push('sell');
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
        } else {
          amount = formatPrice(amount);
        }

        this.trades.unshift({
          side: trade[4] ? 'BUY' : 'SELL',
          size: trade[3],
          exchange: trade[0],
          price: formatPrice(trade[2]),
          amount: amount,
          classname: classname.map(a => 'trades__item--' + a).join(' '),
          icon: icon,
          date: this.ago(trade[1]),
          timestamp: trade[1],
          image: image
        });
      },
      getGifs(refresh) {
        let storage = localStorage ? JSON.parse(localStorage.getItem('1mgifs')) : null;

        if (!refresh && storage && +new Date() - storage.timestamp < 1000 * 60 * 60) {
          this.gifs = storage.data;
        } else {
          fetch('https://api.giphy.com/v1/gifs/search?q=money&rating=r&limit=100&api_key=b5Y5CZcpj9spa0xEfskQxGGnhChYt3hi')
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
	@import '../assets/sass/variables';

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

        .icon-side:before {
          content: unicode($icon-down);
        }
      }

      &.trades__item--buy {
        background-color: lighten($green, 50%);
        color: $green;

        &.trades__item--significant {
          background-color: $green;
        }

        .icon-side:before {
          content: unicode($icon-up);
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
          font-size: 18px;
        }

        &.trades__item__exchange {
          flex-grow: .75;
          min-width: 70px;
        }

        &.trades__item__amount {
          position: relative;

          > span {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
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
          flex-basis: 40px;
          flex-grow: 0;
        }
      }
    }
  }
</style>