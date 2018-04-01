A **heavily** modified version of [beastlybeast's SignificantTrades](https://github.com/beastlybeast/SignificantTrades) with multi exchanges / pairing support & chart visualizer.<br/>
I did that mostly for fun and training, but combining many exchanges data together is kind of interesting to see. 

![screenshot](https://i.imgur.com/j3iP8ds.gif)

- The repo contains a server part to gather & format exchanges data and broadcast it to many clients through websocket communication. 
- The client part is written in vue.js, show live trades in a list based on settings (short timeframe row stacking by amount) and allow to visualize session's buys/sells/price in a little chart (which tick from 10s to 1d depending on zoom, so mostly 10s). It also controls the server so it knows which pair to track.

I did a separated server for monitoring purposes, altough adapting the server logic into the client shouldn't be too hard, the performance could get bad really fast!

## How to use
Clone the repo

```bash
git clone https://github.com/Tucsky/SignificantTrades
```

Have a look at the [server configuration](server/config.json.example) (rename config.json.example into config.json first)

```js
{
  // the port which the server will be at 
  "port": 3000, // (note that you will NEED to update the target url in [client/src/services/socket.js](client/src/services/socket.js))
  
  // delay (in ms) between server broadcasts to avoid large
  "delay": 200, // (the larger the better performance wise)
  
  // default pair it should use 
  "pair": "BTCUSD" // (then you can change it in the client settings)
}
```

Install server dependencies & run it

```bash
cd server
npm install
node index
```

Install client dependencies then run

```bash
cd client
npm install
npm run dev
```

...

Profit !

*TODO*
- [ ] Setup a little demo on github
- [ ] Improve client performances
- [ ] Inter-exchanges volume averaged price
- [ ] Multiple channels monitoring at once (need storage server side)
- [ ] Alerts & push notifications

# SignificantTrades
Live trades visualizer.
Currently supporting Bitstamp, Kraken, Huobi, Hitbtc, Okex, Bitmex, Binance, Bitfinex, Gdax ([see server/src/exchanges/](server/src/exchanges))

## About
Bitmex's Recent Trades pane has a terrible signal-to-noise ratio because of bot activity and the fact that market orders are not batched by order but by matched price, usually resulting in many lines for a single 50k order.

This script uses Bitmex's public trades websocket and does a few things:

1. It collapses all orders with the same timestamp into one line.
2. It allows you to filter out orders less than a particular size.
3. It highlights orders that exceed a certain size.

The end result is a Recent Trades pane you can watch without getting a seizure, and which can be a useful tool to see when aggressive orders are coming in.

## How To Use
1. Open this link: https://beastlybeast.github.io/SignificantTrades/index.html
2. Then type in the symbol name (e.g. XBTUSD), the minimum order threshold (e.g. 5000), and click submit.

## Support Further Development
I'm not a developer, I'm a trader, and I'm paying contractors to build and improve this tool. To contribute ideas or request bug fixes, please use the github issues feature. If you are a developer and would like to contribute code, feel free to do so via Github (or fork this repo). Please make sure to credit me if you do.

Lastly, if you find this tool useful, please consider sending a donation to support further development. 

BTC (segwit) address: bc1q32ncgq5aaffz6l5vxrvfejfwdm9jhqdc3qvk5x