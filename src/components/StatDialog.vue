<template>
  <div class="serie-dialog dialog-mask" @mousedown="cancelIfOutside($event)">
    <div class="dialog-content">
      <header>
        <div class="title">{{ title }}</div>
        <div class="form-group">
          <label
            class="checkbox-control -on-off"
            v-tippy="{ placement: 'bottom' }"
            :title="!enabled ? 'Enable ' + id : 'Disable ' + id"
            @change="$store.dispatch('settings/updateStat', { index: id, prop: 'enabled', value: $event.target.checked })"
          >
            <input type="checkbox" class="form-control" :checked="enabled" />
            <div></div>
          </label>
        </div>
      </header>
      <div class="dialog-body grid">
        <div class="form-group mb8">
          <label>Name</label>
          <input
            type="text"
            class="form-control"
            :value="model.name"
            @change="
              $store.dispatch('settings/updateStat', {
                index: id,
                prop: 'name',
                value: $event.target.value
              })
            "
          />
        </div>
        <div class="form-group -tight" ref="colorContainer">
          <label>Color</label>
          <verte
            picker="square"
            menuPosition="left"
            model="rgb"
            :value="model.color"
            @input="
              $store.dispatch('settings/updateStat', {
                index: id,
                prop: 'color',
                value: $event
              })
            "
          ></verte>
        </div>
        <div class="form-group mb8">
          <label>Period (m)</label>
          <input
            type="text"
            class="form-control"
            :value="getHms(model.period)"
            :placeholder="getHms($store.state.settings.statsPeriod)"
            @change="
              $store.dispatch('settings/updateStat', {
                index: id,
                prop: 'period',
                value: $event.target.value
              })
            "
          />
        </div>
        <div class="form-group mb8">
          <label>Precision</label>
          <input
            type="text"
            class="form-control"
            placeholder="auto"
            :value="model.precision"
            @change="
              $store.dispatch('settings/updateStat', {
                index: id,
                prop: 'precision',
                value: $event.target.value
              })
            "
          />
        </div>
        <div class="form-group">
          <label for
            >Value
            <span
              class="icon-info-circle"
              title="Javascript syntax, use build in variable such as vbuy/vsell (volume) cbuy/csell (trade count) lbuy/lsell (liquidation volume)"
              v-tippy
            ></span
          ></label>
          <textarea
            class="form-control"
            rows="5"
            :value="model.output"
            @change="
              $store.dispatch('settings/updateStat', {
                index: id,
                prop: 'output',
                value: $event.target.value
              })
            "
          ></textarea>
          <p class="help-text mt-8">
            Sum <code>{{ model.output }}</code> over {{ getHms(model.period || $store.state.settings.statsPeriod) }} period
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import store from '../store'
import { getHms } from '../utils/helpers'

export default {
  data: () => ({
    title: 'Stat',
    enabled: true,
    model: {
      color: null,
      enabled: null,
      name: null,
      output: null,
      precision: null,
      period: null
    }
  }),
  created() {
    this.model = store.state.settings.statsCounters[this.id] || {}
  },
  methods: {
    cancelIfOutside(event) {
      if (event.target.classList.contains('dialog-mask')) {
        this.$close(false)
      }
    },
    getHms(value) {
      return getHms(value)
    }
  }
}
</script>
