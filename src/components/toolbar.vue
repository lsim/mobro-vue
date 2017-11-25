<template>
  <div class="toolbar">
    <span class="current-server">
      <h1>MoBro</h1>
      <span v-if="modelDetails" class="current-server__details">{{modelDetails.host}} - mapi: {{modelDetails.mapi}} - cis: {{modelDetails.cis}}</span>
    </span>
    <form class="server-selector" @submit.prevent="setCurrentCis(inputContent)">
      <autocomplete v-model="inputContent"
                       :options="knownHosts"
                       :placeholder="'server - eg funklateststandalone)'"
                       class="server-selector__input"></autocomplete>
      <button type="submit" class="server-selector__button">Go!</button>
    </form>
  </div>
</template>

<script lang="ts">
  import Vue from "vue";
  import { Component } from 'vue-property-decorator';
  import modelMetaService, { ModelDetails } from '../services/model-meta'
  import localStorageService from '../services/localstorage'
  import AutoComplete from './autocomplete'

  @Component({
    components: {
      autocomplete: AutoComplete
    }
  })
  export default class ToolBar extends Vue {
    inputContent: string = '';
    selectedHost: string = '';
    knownHosts: string[] = [];
    modelDetails: ModelDetails | null = null;

    mounted() {
      this.loadHostConfig();
      modelMetaService.detailsChanged.attach((modelDetails: ModelDetails) => {
        this.modelDetails = modelDetails;
        this.addKnownHost(modelDetails.host);
        this.selectedHost = modelDetails.host;
        localStorageService.set('selectedHost', this.selectedHost);
      });
    }

    loadHostConfig() {
      let selectedHost = localStorageService.get('selectedHost');
      if(selectedHost) {
        this.selectedHost = selectedHost;
        this.setCurrentCis(this.selectedHost);
      }
      let knownHostObj = localStorageService.getObject('knownHosts');
      if(knownHostObj && knownHostObj.knownHosts) {
        this.knownHosts = knownHostObj.knownHosts;
      }
    }

    addKnownHost(host: string) {
      if(this.knownHosts.indexOf(host) === -1) {
        this.knownHosts.push(host);
        this.knownHosts.sort();
        localStorageService.setObject('knownHosts', { knownHosts: this.knownHosts});
      }
    }

    setCurrentCis(metaModelHostName: string) {
      modelMetaService.setModelMetaHost(metaModelHostName);
      this.inputContent = '';
    }
  }
</script>

<style lang="scss">
  .toolbar {
    background-color: #106cc8;
    color: rgba(255, 255, 255, 0.87);
    padding: 0 16px;

    flex: 0 0 50px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    .current-server  {
      display: flex;
      flex: 1 0 auto;
      align-items: center;
      h1 {
        display: flex;
        font-size: 20px;
        font-weight: normal;
        letter-spacing: 0.1px;
        line-height: 48px;
        margin-right: 10px;
      }
      &__details {
        position: absolute;
        top: 36px;
        font-size: 70%;
      }
    }

    .server-selector {
      display: flex;
      flex: 0 0 300px;

      &__input {
        flex: 1 1 auto;
      }

      &__button {
        flex: 0 0 20px;
      }
    }
  }
</style>
