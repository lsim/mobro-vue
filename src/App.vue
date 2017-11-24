<template>
  <div id="app">
    <div class="icon"></div>
    <TypeGraph :modelTypes="modelTypes" :model-types="modelTypes"></TypeGraph>
    <AutoComplete
      :placeholder="'placeholder?!'"
      :options="['opt1','opt2','opt3','foo1', 'foo2' ]"
      v-model="autoCompleteOutput">
    </AutoComplete>
    <LogArea numLines="3"></LogArea>
    <mobro></mobro>
  </div>
</template>

<script lang="ts">
  import Vue from 'vue'
  import {Component, Watch} from 'vue-property-decorator'
  import TypeGraph from './components/typegraph'
  import LogArea from './components/log-area'
  import AutoComplete from './components/autocomplete'
  import logger from './services/logger'
  import { IRawModelType, ModelType } from "./services/model-meta"
  import MoBro from './components/mobro'

  @Component({
    components: {
      LogArea,
      AutoComplete,
      TypeGraph,
      mobro: MoBro
    }
  })
  export default class App extends Vue {

    counter = 0;
    autoCompleteOutput: string = "initial?";

    @Watch('autoCompleteOutput')
    onOutputChange(newValue: string) {
      console.debug("New value", newValue);
    }

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
      @include icon-mixin(house);
    }
  }
</style>
