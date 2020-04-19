import Vue from 'vue'
import Vuex from 'vuex'

import settings from './settings'
import app from './app'

Vue.use(Vuex)

const store = new Vuex.Store({
  modules: {
    app,
    settings
  }
})

if (store.state.settings.pair && store.state.settings.pair.length) {
  store.state.app.pairs = store.state.settings.pair.split('+');
}

let saveTimeout;

store.subscribe((mutation, state) => {
  if (/^settings/.test(mutation.type)) {
    clearTimeout(saveTimeout)

    saveTimeout = setTimeout(() => {
      console.log(mutation, 'save..')
      const copy = JSON.parse(JSON.stringify(state.settings))
      localStorage.setItem('settings', JSON.stringify(copy))
    }, 200)
  }

  switch (mutation.type) {
    case 'settings/SHOW_EXCHANGE':
    case 'settings/HIDE_EXCHANGE':
    case 'settings/TOGGLE_EXCHANGE_VISIBILITY':
    case 'settings/ENABLE_EXCHANGE':
    case 'settings/DISABLE_EXCHANGE':
    case 'settings/TOGGLE_EXCHANGE_CHART':
    case 'settings/SET_EXCHANGE_MATCH':

      let name
      if (typeof mutation.payload.exchange === 'string') {
        name = mutation.payload.exchange
      } else {
        name = mutation.payload
      }

      store.dispatch('app/refreshExchange', name)
      break
  }
})

export default store