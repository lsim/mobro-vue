<template>
  <div id="app">
    <div class="icon"></div>
    <TypeGraph :modelTypes="modelTypes" :model-types="modelTypes"></TypeGraph>
    <AutoComplete
      :placeholder="'placeholder?!'"
      :options="['opt1','opt2','opt3','foo1', 'foo2' ]">
    </AutoComplete>
    <LogArea numLines="3"></LogArea>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import { Component } from 'vue-property-decorator'
  import TypeGraph from './components/typegraph'
  import LogArea from './components/log-area'
  import AutoComplete from './components/autocomplete'
  import logger from './services/logger'
  import { IRawModelType, ModelType } from "./services/model-meta";

  @Component({
    components: {
      LogArea,
      AutoComplete,
      TypeGraph
    }
  })
  export default class App extends Vue {

    counter = 0;

    modelTypes: Array<ModelType> = [
      new ModelType(<IRawModelType>{
        _extends: "Entity",
        attributes: ["attr1", "attr2"],
        fields: [],
        path: "Activity",
      }),
      new ModelType(<IRawModelType>{
        _extends: "Activity",
        attributes: ["attr3", "attr4"],
        fields: [],
        path: "ClinicalActivity",
      })
    ];

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
