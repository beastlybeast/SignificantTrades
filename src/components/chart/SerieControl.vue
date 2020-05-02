<template>
  <div class="serie">
    <div class="serie__name" @click="edit">{{ id }}</div>
    <div v-if="legend" class="serie__legend">{{ legend }}</div>
  </div>
</template>

<script>
import SerieDialog from './SerieDialog'
import { create } from 'vue-modal-dialogs'

export default {
  props: ['id', 'legend'],
  methods: {
    edit() {
      const dialog = create(SerieDialog, 'id')
      dialog(this.id)
    }
  }
}
</script>

<style lang="scss">
.serie {
  display: flex;
  align-items: center;

  &__name {
    position: relative;
    cursor: pointer;

    &:hover:before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -2px;
      height: 2px;
      background-color: white;
    }
  }

  &__legend {
    color: lighten($green, 20%);
    margin-left: 0.4em;
    font-family: monospace;
    text-shadow: 1px 1px black;
  }

  &__control {
    display: none;

    a {
      display: block;
      margin: 0 0.2em;
      color: white;

      i {
        font-size: 0.75em;
      }
    }
  }

  &:hover {
    .serie__control {
      display: flex;
    }
  }
}
</style>
