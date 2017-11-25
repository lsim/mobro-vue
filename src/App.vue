<template>
  <div id="app">
    <mobro></mobro>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { Component } from 'vue-property-decorator'
  import MoBro from './components/mobro'

  @Component({
    components: {
      mobro: MoBro
    }
  })
  export default class App extends Vue {

  }
</script>

<style lang="scss">
  @import 'styling/main.scss';
  #app {

  }
</style>
