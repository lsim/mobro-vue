<template>
  <div class="mobro">
    <toolbar class="toolbar"></toolbar>
    <form @submit.prevent="lookupEntity" class="query-form">
      <autocomplete v-model="typeSearchString"
                    :options="allTypes"
                    :placeholder="'type to look up - try BPLA or ExMPLA'" class="type-input"
                    v-keybinding.focus.once="['ctrl', 't']"></autocomplete>
      <autocomplete v-model="propSearchString"
                    :options="allProperties"
                    :placeholder="'property to look for - try .Encounter or P.E'" class="prop-input"
                    v-keybinding.focus.once="['ctrl', 'p']"></autocomplete>
      <button type="submit" class="lookup-bn">Look up</button>
      <button type="button" v-keybinding="['esc']" @boundkeydown="clearSelection"  @click="clearSelection" class="clear-bn">Clear</button>
    </form>
    <logarea :numLines="10" class="logarea"></logarea>
    <typegraph
      class="typegraph"
      :modelTypes="modelTypes"
      @nodeDoubleClicked="modelTypeToggled($event)"></typegraph>
    <div class="entity-description-container">
      <mapientity v-for="(modelType, idx) in modelTypes" :key="modelType.name"
                  :modelType="modelType"
                  @remove="toggleTypeInCollection(modelType)"
                  @navigate="toggleTypeInCollection($event)"></mapientity>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from "vue";
  import { Component, Prop, Watch } from 'vue-property-decorator';
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

    // When the user has not changed the selection for two hours, reset the selection automatically
    debouncedReset: (() => any) | null = null;
    @Watch('modelTypes')
    onModelTypesChanged() {
      // Having trouble getting the right 'this' reference in the debounce callback. So assigning the function from here as a workaround
      if (this.debouncedReset == null) {
        this.debouncedReset = _.debounce(() => {
          if (this.modelTypes.length > 0) {
            this.clearSelection();
            logService.logMsg("Cleared selection due to inactivity");
          }
        }, 2 * 60 * 60 * 1000); // Two hours
      }
      if (this.modelTypes.length > 0) {
        this.debouncedReset();
      }
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
      }).catch(() => {
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
      if(this.typeSearchString) {
        if(this.addTypeByName(this.typeSearchString)) {
          setTimeout(() => this.typeSearchString = '');
        }
      } else if(this.propSearchString) {
        let typeNameMatch = this.propSearchString.match(/^[^\.]+/);
        if(typeNameMatch && this.addTypeByName(typeNameMatch[0])) {
          setTimeout(() => this.propSearchString = '');
        }
      }
    }

    modelTypeToggled({ modelType: modelType, event: event }: {modelType: ModelType, event: MouseEvent}) {
      this.toggleTypeInCollection(modelType);
    }

    clearSelection() {
      this.modelTypes = [];
    }

  }
</script>
<style lang="scss">
  @import '../styling/material-palette';
  @import '../styling/main';

  .mobro {

    //
    // Layout
    //

    // Anchor elements into the grid
    .toolbar { grid-area: toolbar; }
    .query-form { grid-area: queryform; }
    .typegraph { grid-area: typegraph; }
    .logarea { grid-area: typegraph; }
    .entity-description-container { grid-area: entitydescriptioncontainer; overflow-y: auto; }

    // Define the overall page layout
    display: grid;
    grid-template-rows: 50px auto 1fr;
    grid-template-columns: 5fr 3fr;
    grid-template-areas:
      "toolbar toolbar"
      "queryform queryform"
      "typegraph entitydescriptioncontainer";

    // Prevent main screen from scrolling - only entity descriptors should scroll vertically
    max-height: 100vh;
    min-height: 100vh;

    // Lay out the form inputs
    .query-form {
      display: grid;
      grid-template-columns: 1fr 1fr auto auto;
    }

    //
    // Styling
    //
    .clear-bn {
      background-color: palette(Red);
    }

    .logarea {
      height: 5em;
      position: relative;
      z-index: -1;
      overflow-y: hidden;
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
  }

</style>
