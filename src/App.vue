<template>
  <div id="app">
    <img src="./assets/logo.png">
    <HelloWorld/>
    <LogArea numLines="3">foo</LogArea>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { Component } from 'vue-property-decorator'
  import HelloWorld from './components/HelloWorld'
  import LogArea from './components/log-area.vue'
  import logService from './services/logger'

  @Component({
    components: {
      HelloWorld,
      LogArea
    }
  })
  export default class App extends Vue {

    counter = 0;

    mounted() {
      setInterval(() => {
        logService.logMsg("Here's a message! " + this.counter++);
      }, 1000)
    }
  }
</script>

<style lang="scss">
  @import 'styling/main.scss';
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
