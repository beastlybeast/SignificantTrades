# SignificantTrades [![Build Status](https://travis-ci.org/Tucsky/SignificantTrades.svg?branch=master)](https://travis-ci.org/Tucsky/SignificantTrades)

Live cryptocurrency trades visualizer.<br>
Currently supporting BitMEX, Bitfinex, Binance & Binance Futures, Gdax, Bitstamp, Deribit, Huobi, Okex, Hitbtc, Poloniex, Bybit and FTX ([see server/src/exchanges/](server/src/exchanges) for detail)

![screenshot](https://i.imgur.com/nHJxsdL.gif)

## What it do

This tool shows **markets orders filling limit orders** LIVE on the crypto markets.

- Show LIVE trades from exchanges on a specific pair (default BTCUSD)
- Filter noise by aggregating trades with the same timestamp
- Chart averaged price, buy & sell volume, price sma, volume ema
- Play audio when trade show up based on volume
- Visualize historical data (when available)

## How it works

The app is written in vue.js, use the javascript WebSocket interface to connect to the exchanges API directly and listen to the trades events. From there it dispatch the trades to difference components within the app :

- The trade list that shows the N previous significant orders
- The chart that shows the averaged price action over the different exchanges

## How to install & run locally

1. Clone the repo

```bash
git clone https://github.com/Tucsky/SignificantTrades
```

2. Install dependencies

```bash
npm install
```

3. Run dev mode

Dev mode is

```bash
npm run dev
```

This will automatically open a browser window at localhost:8080

Otherwise can build the application

```bash
npm run build
```

and access the index.html directly in the browser later without having to run a command

...

5. Profit !

## Implement historical data

You can use this project without historical data just by opening the app in your browser, as getting trades from exchanges is made directly in the browser using websocket api.

However, in order to show historical data you will need a server part.

I use my servers (api.aggr.trade) to store and serve historical trades on demand.
The current code for the server part is located in the [feature/server](https://github.com/Tucsky/SignificantTrades/tree/feature/server) branch.
Let's say you have a server instance running on port 3000, start the client with an environment variable `API_URL=http://localhost:3000/historical/{from}/{to}/{timeframe} npm run dev`.

## Adblocker issue (and solution)

Some adblocker restrict access to exchanges websocket feeds.
I know uBlock origin block many thing including huobi websocket API.
**Just disable Adblock on the app and you should be alright.**

## Cross-Domain (CORS) policy issue (and solution)

In order to fetch the products the app need to make calls to the exchanges API. Most of thoses API tell the browser they only allow access from the exchange domain (see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS). The only way to bypass this is to use a server that will make the call for us. The cors proxy settings let u set the url of this server, which is set to mine by default.
**Running `PROXY_URL=http://my-personnal-cors-proxy.me/ npm run dev` will start the app with another cors proxy which I encourage you to do.**

## Donate

LN https://tippin.me/@Tucsky ⚡️
BTC [3KjgsrxrQRannoEBSmUdCobuHZyTU3QFB6](bitcoin:3KjgsrxrQRannoEBSmUdCobuHZyTU3QFB6)
XMR 48NJj3RJDo33zMLaudQDdM8G6MfPrQbpeZU2YnRN2Ep6hbKyYRrS2ZSdiAKpkUXBcjD2pKiPqXtQmSZjZM7fC6YT6CMmoX6
