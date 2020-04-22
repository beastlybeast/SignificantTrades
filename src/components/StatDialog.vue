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
            @change="
              $store.dispatch('settings/updateStat', { index: id, prop: 'enabled', value: $event.target.checked })
            "
          >
            <input
              type="checkbox"
              class="form-control"
              :checked="enabled"
            />
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
            @change="$store.dispatch('settings/updateStat', {
            index: id,
            prop: 'name',
            value: $event.target.value
          })"
          />
        </div>
        <div class="form-group -tight" ref="colorContainer">
          <label>Color</label>
          <verte picker="square" menuPosition="left" model="rgb" :value="model.color" @input="$store.dispatch('settings/updateStat', {
            index: id,
            prop: 'color',
            value: $event,
          })"></verte>
        </div>
        <div class="form-group mb8">
          <label>Period</label>
          <input type="text" class="form-control" :value="model.period" @change="$store.dispatch('settings/updateStat', {
            index: id,
            prop: 'period',
            value: $event.target.value
          })">
        </div>
        <div class="form-group mb8">
          <label>Smoothing</label>
          <input
            type="text"
            class="form-control"
            placeholder="no smoothing"
            :value="model.smoothing"
            @change="$store.dispatch('settings/updateStat', {
            index: id,
            prop: 'smoothing',
            value: $event.target.value
          })"
          />
        </div>
        <div class="form-group mb8">
          <label>Precision</label>
          <input
            type="text"
            class="form-control"
            placeholder="auto"
            :value="model.precision"
            @change="$store.dispatch('settings/updateStat', {
            index: id,
            prop: 'precision',
            value: $event.target.value
          })"
          />
        </div>
        <div class="form-group">
          <label for>Value</label>
          <textarea
            class="form-control"
            rows="5"
            :value="model.output"
            @change="$store.dispatch('settings/updateStat', {
            index: id,
            prop: 'output',
            value: $event.target.value
          })"
          ></textarea>
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
      smoothing: null,
    },
  }),
  computed: {
    statsPeriod: () => store.state.settings.statsPeriod,
  },
  created() {
    this.model = store.state.settings.statsCounters[this.id] || {};
  },
  methods: {
    cancelIfOutside(event) {
      if (event.target.classList.contains('dialog-mask')) {
        this.$close(false);
      }
    },
  }
}
</script>