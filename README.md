# SignificantTrades
A more useful version of the Recent Trades pane on Bitmex.

![screenshot](https://i.imgur.com/S2xcNAt.png)

## About
Bitmex's Recent Trades pane has a terrible signal-to-noise ratio because of bot activity and the fact that market orders are not batched by order but by matched price, usually resulting in many lines for a single 50k order.

This script uses Bitmex's public trades websocket and does a few things:

1. It collapses all orders with the same timestamp into one line.
2. It allows you to filter out orders less than a particular size.
3. It highlights orders that exceed a certain size.

The end result is a Recent Trades pane you can watch without getting a seizure, and which can be a useful tool to see when aggressive orders are coming in.

## How To Use
Just open the HTML file and type in the symbol name (e.g. XBTUSD) and minimum order threshold (e.g. 5000).

## Support Further Development
I'm not a developer, I'm a trader, and I'm paying contractors to build and improve this tool. If you find it useful, please consider sending a donation to support further development. Please also send your ideas to make this even more useful.

BTC (segwit) address: bc1q32ncgq5aaffz6l5vxrvfejfwdm9jhqdc3qvk5x