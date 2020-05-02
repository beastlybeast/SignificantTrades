export default {
  updateStat({ commit, state }, { index, prop, value }) {
    if (state.statsCounters[index][prop] === value) {
      return
    }

    let mutation = ''

    if (typeof value === 'boolean') {
      mutation += 'TOGGLE_STAT'
    } else {
      mutation += 'SET_STAT_' + prop.toUpperCase()
    }

    commit(mutation, {
      index,
      value
    })
  },
  setSeriePreference({ commit, state }, { id, key, value }) {
    try {
      value = JSON.parse(value)
    } catch (error) {
      // empty
    }

    if (state.series[id] && state.series[id][key] === value) {
      return
    }

    commit('SET_SERIE_OPTION', { id, key, value })
  }
}
