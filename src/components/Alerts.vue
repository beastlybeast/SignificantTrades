<template>
	<div class="alerts">
		<div v-for="(alert, index) in alerts" class="alert" :key="alert.id" :class="'alert--' + alert.type" v-on:click="alert.click ? alert.click(alert) && dismiss(index) : dismiss(index)">
			<span class="alert__icon icon-"></span>
			<div class="alert__title">{{ alert.title }}</div>
			<div v-if="alert.message" class="alert__message" v-html="alert.message"></div>
		</div>
	</div>
</template>

<script>
import options from "../services/options";
import socket from "../services/socket";

export default {
  data() {
    return {
      alerts: []
    };
  },
  created() {
    socket.$on('alert', alert => {
      if (alert === 'clear') {
        this.alerts.splice(0, this.alerts.length);
        return;
      }

      if (alert.id) {
        for (let _alert of this.alerts) {
          if (_alert.id === alert.id) {
            this.alerts.splice(this.alerts.indexOf(_alert), 1);

            break;
          }
        }
      } else {
        alert.id = Math.random()
          .toString(36)
          .substring(7);
      }

      alert.timestamp = +new Date();

      if (!alert.title) {
        alert.title = alert.message;

        delete alert.message;
      }

      if (!alert.title && !alert.message) {
        return;
      }

      if (alert.message) {
        alert.message = alert.message.trim().replace(/\n/, '<br>');
      }

      this.alerts.push(alert);

      if (alert.type !== 'error') {
        setTimeout(() => {
          this.dismiss(this.alerts.indexOf(alert));
        }, 1000 * 30);
      }
    });
  },
  methods: {
    dismiss(index) {
      this.alerts.splice(index, 1);
    }
  }
};
</script>

<style lang="scss">
@import '../assets/sass/variables';

.alerts {
  position: absolute;
  z-index: 1;
  display: flex;
  margin: 20px;
  left: 0;
  right: 0;
  flex-direction: row;
  flex-wrap: wrap;
  pointer-events: none;
}

.alert {
  display: flex;
  color: white;
  cursor: pointer;
  flex-wrap: wrap;
  padding: 8px 10px;
  border-radius: 2px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05), 0 5px 20px rgba(0, 0, 0, 0.1);
  width: auto;
  flex-grow: 0;
  flex-basis: auto;
  margin-right: auto;
  margin-bottom: 10px;
  pointer-events: all;

  > .alert__message {
    flex-basis: 100%;
    font-size: 70%;
    margin: 5px 0 0;
    line-height: 1.4;
  }

  > .alert__title {
    flex-grow: 1;
  }

  > .alert__icon {
    flex-basis: auto;
    margin-right: 5px;
    font-size: 18px;
  }

  &.alert--error {
    background-color: $red;

    .alert__icon:before {
      content: unicode($icon-cross);
    }
  }

  &.alert--warning {
    background-color: $orange;

    .alert__icon:before {
      content: unicode($icon-warning);
    }
  }

  &.alert--success {
    background-color: $green;

    .alert__icon:before {
      content: unicode($icon-check);
    }
  }

  &.alert--info {
    background-color: $blue;

    .alert__icon:before {
      content: unicode($icon-info);
    }
  }
}
</style>
