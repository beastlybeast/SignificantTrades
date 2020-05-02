<template>
  <div class="serie-dialog dialog-mask" @mousedown="cancelIfOutside($event)">
    <div class="dialog-content">
      <header>
        <div class="title">{{ title }}</div>
        <div class="column -center">
          <dropdown
            class="available-types -left -center"
            :selected="type"
            label="Type"
            :options="availableTypes"
            placeholder="type"
            @output="$store.commit('settings/SET_SERIE_TYPE', { id, value: $event })"
          ></dropdown>
          <div class="form-group">
            <label
              class="checkbox-control -on-off"
              v-tippy="{ placement: 'bottom' }"
              :title="!enabled ? 'Enable ' + id : 'Disable ' + id"
              @change="$store.commit('settings/TOGGLE_SERIE', { id, value: $event.target.checked })"
            >
              <input type="checkbox" class="form-control" :checked="enabled" />
              <div></div>
            </label>
          </div>
        </div>
      </header>
      <div class="dialog-body grid">
        <div
          v-for="(option, index) in model"
          :key="index"
          class="form-group"
          :class="{
            'w-100': option.type === 'string' || option.type === 'position',
            '-tight': option.type === 'boolean' || option.type === 'color',
            '-inline': option.type === 'color' || option.type === 'boolean'
          }"
        >
          <label v-if="option.label !== false">{{ option.label }}</label>

          <template v-if="option.type === 'string' || option.type === 'number'">
            <editable class="form-control" :content="option.value" @output="validate(option, $event)"></editable>
          </template>
          <template v-if="option.type === 'color'">
            <verte picker="square" menuPosition="left" model="rgb" :value="option.value" @input="validate(option, $event)"></verte>
          </template>
          <template v-if="option.type === 'boolean'">
            <label class="checkbox-control">
              <input type="checkbox" class="form-control" :checked="option.value" @change="validate(option, $event.target.checked)" />
              <div></div>
            </label>
          </template>
          <template v-if="option.type === 'position'">
            <div class="column">
              <div class="-fill">
                <div class="text-center">Start</div>
                <div class="column help-text">
                  <div class="text-left">Start at top</div>
                  <div class="text-right">Start at bottom</div>
                </div>
                <input class="w-100" type="range" min="0" max="1" step=".1" :value="option.value.top" @input="setScale('top', $event.target.value)" />
              </div>
              <div class="-fill">
                <div class="text-center">End</div>
                <div class="column help-text">
                  <div class="text-left">End at top</div>
                  <div class="text-right">End at bottom</div>
                </div>
                <input
                  class="w-100  -reverse"
                  type="range"
                  min="0"
                  max="1"
                  step=".1"
                  :value="option.value.bottom"
                  @input="setScale('bottom', $event.target.value)"
                />
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import seriesData from '../../data/series'
import store from '../../store'
import { camelToSentence, snakeToSentence } from '../../utils/helpers'

const labels = {
  scaleMargins: false,
  color: 'Couleur',
  lineWidth: 'Line width',
  length: 'Length'
}

export default {
  data: () => ({
    title: 'Serie',
    enabled: true,
    type: 'line',
    model: [],
    options: [],
    availableTypes: { line: 'Line', histogram: 'Histogram', candlestick: 'Candlestick', bar: 'Bar' }
  }),
  computed: {
    userPreferences: function() {
      const options = store.state.settings.series[this.id] || {}

      return options
    }
  },
  created() {
    this.title = snakeToSentence(this.id)
    this.enabled = typeof this.userPreferences.enabled === 'undefined' ? true : this.userPreferences.enabled
    this.type = typeof this.userPreferences.type === 'undefined' ? seriesData[this.id].type : this.userPreferences.type

    this.refreshModel()

    if (module.hot) {
      module.hot.dispose(() => {
        debugger
        this.$close(false)
      })
    }
  },
  methods: {
    getType(value, key) {
      let type = 'string'

      try {
        value = JSON.parse(value)
      } catch (error) {
        // empty
      }

      if (typeof value === 'number') {
        type = 'number'
      } else if (typeof value === 'boolean') {
        type = 'boolean'
      } else if (/^rgba?/.test(value) || /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
        type = 'color'
      } else if (key === 'scaleMargins') {
        type = 'position'
      }

      return type
    },
    refreshModel() {
      this.model.splice(0, this.model.length)

      for (let key in seriesData[this.id].options || {}) {
        if (['overlay', 'scaleGroup'].indexOf(key) !== -1) {
          continue
        }

        const defaultValue = seriesData[this.id].options[key]

        let value

        if (typeof this.userPreferences[key] !== 'undefined') {
          value = this.userPreferences[key]
        } else {
          value = defaultValue
        }

        let label = labels[key]

        if (typeof label === 'undefined') {
          label = camelToSentence(key)
        }

        this.model.push({
          key,
          label,
          value: value,
          type: this.getType(defaultValue, key)
        })
      }
    },
    cancelIfOutside(event) {
      if (event.target.classList.contains('dialog-mask')) {
        this.$close(false)
      }
    },
    validate(option, value) {
      store.dispatch('settings/setSeriePreference', {
        id: this.id,
        key: typeof option === 'string' ? option : option.key,
        value: value
      })

      const modelIndex = this.model.indexOf(option)

      if (modelIndex !== -1) {
        this.$set(this.model[modelIndex], 'value', value)
      }
    },
    setScale(side, value) {
      const option = this.getOptionByKey('scaleMargins')

      const scale = {
        top: option.value.top,
        bottom: option.value.bottom
      }

      scale[side] = +value || 0

      if (scale.top + scale.bottom > 1) {
        scale[side] = 1 - scale[side === 'top' ? 'bottom' : 'top']
      }

      if (this.id === 'price') {
        store.commit('settings/SET_CHART_PRICE_MARGINS', scale)
      }

      this.validate(option, scale)
    },
    getOptionByKey(key) {
      for (let i = 0; i < this.model.length; i++) {
        if (this.model[i].key === key) {
          return this.model[i]
        }
      }
    },
    setType(type) {
      this.validate('type', type)
    },
    getValue(key) {
      const preferedValue = (store.state.settings.series[this.id] || {})[key]
      const defaultValue = seriesData[this.id].options[key]

      if (typeof preferedValue !== 'undefined') {
        return preferedValue
      } else {
        return defaultValue
      }
    }
  }
}
</script>
