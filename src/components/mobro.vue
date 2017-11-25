<template>
  <div class="mobro">
    <toolbar></toolbar>
    <div class="lookupgraph">
      <form @submit.prevent="lookupEntity"
            class="lookupgraph__query-form">
        <autocomplete v-model="typeSearchString"
                      :options="allTypes"
                      :placeholder="'type to look up - try BPLA or ExMPLA'"
                      class="lookupgraph__query-form__autocomplete"></autocomplete>
        <autocomplete v-model="propSearchString"
                      :options="allProperties"
                      :placeholder="'property to look for - try .Encounter or P.E'"
                      class="lookupgraph__query-form__autocomplete"></autocomplete>
        <button type="submit">Look up</button>
        <button type="button" @click="clearSelection" class="lookupgraph__query-form__clear-button">Clear</button>
      </form>
      <div class="lookupgraph__entity-canvas">
        <logarea :numLines="5" class="lookupgraph__entity-canvas__logarea"></logarea>
        <typegraph
          class="lookupgraph__entity-canvas__typegraph"
          :modelTypes="modelTypes"
          @nodeClicked="modelTypeClicked($event)"
        ></typegraph>
        <div class="lookupgraph__entity-canvas__model-types">
          <mapientity v-for="(modelType, idx) in modelTypes" :key="modelType.name"
                      :modelType="modelType"
                      @remove="toggleTypeInCollection(modelType)"
                      @navigate="toggleTypeInCollection($event)"
                      class="lookupgraph__entity-canvas__model-type"></mapientity>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from "vue";
  import { Component, Prop } from 'vue-property-decorator';
  import logService, {LogEntry, LogService} from "../services/logger";
  import modelMetaService, { ModelType } from "../services/model-meta";
  import LogArea from './log-area';
  import AutoComplete from './autocomplete'
  import TypeGraph from './typegraph'
  import MapiEntity from './mapientity'
  import ToolBar from './toolbar'
  import * as _ from 'lodash'

  @Component({
    components: {
      logarea: LogArea,
      autocomplete: AutoComplete,
      typegraph: TypeGraph,
      mapientity: MapiEntity,
      toolbar: ToolBar,
    }
  })
  export default class MoBro extends Vue {

    allTypes: Array<string> = [];
    allProperties: Array<string> = [];
    typeMap: {[key: string]: ModelType} = {};
    typeSearchString = '';
    propSearchString = '';
    modelTypes: Array<ModelType> = [];
    cleanup: (() => any)[] = [];

    mounted() {
      this.cleanup.push(modelMetaService.hostChanged.attach((newHost: string) => this.initFromSource(newHost)));
      this.initFromSource(modelMetaService.currentModelMetaHost);
    }

    beforeDestroy() {
      this.cleanup.forEach((fn) => fn());
    }

    initFromSource(host: string) {
      let selectedTypes = this.modelTypes.map((modelType) => modelType.name);
      this.clearSelection();
      modelMetaService.getFullTypeHierarchy().then((fullTypeHierarchy) => {
        this.typeMap = fullTypeHierarchy;
        this.allTypes = _.keys(fullTypeHierarchy);
        this.allProperties = this.getAllProperties(fullTypeHierarchy);
        logService.logMsg(`Loaded ${this.allTypes.length} entities and ${this.allProperties.length} properties from ${host}`);
        selectedTypes.forEach((typeName) => this.addTypeByName(typeName));
      }).catch((error) => {
        logService.logErr(`Failed loading type information from ${host}`);
      });
    }

    getAllProperties(typeMap: {[key: string]: ModelType}): Array<string> {
      let result: Array<string> = [];
      _.values(typeMap).forEach((type: ModelType) => {
        result = result.concat(type.properties.map((p) => `${type.name}.${p.name}`));
      });
      result.sort();
      return result;
    }

    addTypeByName(name: string): ModelType {
      const newModelType = this.typeMap[name];
      if(newModelType) {
        this.addTypeToCollection(newModelType);
      }
      return newModelType;
    }

    addTypeToCollection(modelType: ModelType) {
      if(modelType && this.modelTypes.indexOf(modelType) < 0) {
        this.modelTypes.push(modelType);
        this.modelTypes = this.modelTypes.slice(); // Force angular to detect the change to the array
      }
    }

    toggleTypeInCollection(modelType: ModelType) {
      const index = this.modelTypes.indexOf(modelType);
      if(index >= 0) {
        this.modelTypes.splice(index, 1);
      } else {
        this.modelTypes.push(modelType);
      }
      this.modelTypes = this.modelTypes.slice();
    }

    lookupEntity() {
      console.debug(this.typeSearchString, this.propSearchString);
      if(this.typeSearchString) {
        if(this.addTypeByName(this.typeSearchString)) {
          this.typeSearchString = '';
        }
      } else if(this.propSearchString) {
        let typeNameMatch = this.propSearchString.match(/^[^\.]+/);
        if(typeNameMatch && this.addTypeByName(typeNameMatch[0])) {
          this.propSearchString = '';
        }
      }
    }

    modelTypeClicked({ modelType: modelType, event: event }: {modelType: ModelType, event: MouseEvent}) {
      if(event.detail === 2) { // double click
        this.toggleTypeInCollection(modelType);
      }
      //console.debug('modelTypeClicked', modelType, event);
    }

    clearSelection() {
      this.modelTypes = [];
    }

  }
</script>
<style lang="scss">
  @import '../styling/material-palette';

  .lookupgraph {
    /*flex: 1 1 auto; //Note: this doesn't belong here, but for some reason styling won't apply to siblings of router output*/
    display: flex;
    flex-direction: column;
  }

  .lookupgraph {
    &__query-form {
      flex: 0 0 auto;
      display: flex;
      align-items: center;

      &__autocomplete {
        flex: 1 0 auto;
      }

      &__clear-button {
        background-color: palette(Red);
      }
    }

    &__entity-canvas {
      flex: 1 1 auto;
      display: flex;
      flex-wrap: wrap;
      position: relative;

      &__logarea {
        position:absolute;
        z-index: -1;
        left: 5px;
        top: 5px;


        &::before {
          content: "";
          position: absolute;
          width: 100%;
          height: 100%;
          background-image: linear-gradient(to bottom, rgba(255,255,255, .6), white);
        }
      }

      &__typegraph {
        flex: 2 0 100px;
      }

      &__model-types {
        flex: 1 0 100px;
        overflow-y: scroll;
      }

      &__model-type {
        flex: 1 0 100px;
      }
    }
  }

  ul {
    list-style-type: none;
    padding: 0 0 0 8px;
  }
</style>
