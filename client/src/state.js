const ws = new WebSocket('ws://localhost:3000');

ws.onopen = event => {
  console.log('connected');
  state.connected = true;
};

ws.onclose = event => {
  console.log('disconnected');
  state.connected = false;
};

ws.onmessage = message => {
  console.log('message received', message);
};

const state = {
  connected: false,
  trades: [],
}

export default state