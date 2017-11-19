<template>
  <div id="app">
    <div class="icon"></div>
    <LogArea numLines="3">foo</LogArea>
    <AutoComplete
      :placeholder="'placeholder?!'"
      :options="['opt1','opt2','opt3' ]"></AutoComplete>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { Component } from 'vue-property-decorator'
//  import HelloWorld from './components/HelloWorld'
  import LogArea from './components/log-area'
  import AutoComplete from './components/autocomplete'
  import logger from './services/logger'

  @Component({
    components: {
      LogArea,
      AutoComplete
    }
  })
  export default class App extends Vue {

    counter = 0;

    mounted() {
      setInterval(() => {
        logger.logMsg("Here's a message! " + this.counter++);
      }, 1000)
    }
  }
</script>

<style lang="scss">
  @import 'styling/main.scss';
  #app {
    .icon {
      @include icon-mixin('house');
    }
  }
</style>
