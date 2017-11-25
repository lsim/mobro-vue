<template>
  <div class="mapientity">
    <div class="entity_header">
    <span>
      <span class="entity_header_name">{{modelType.name}}</span>
      <span v-if="modelType.superType" class="entity_header_superclass">
        extends <a class="entity_header_superclass_name" @click="navigateTo(modelType.superType)">{{modelType.superType.name}}</a>
      </span>
    </span>
      <a @click="onRemoveClick" class="entity_remove_link" title="Dismiss"></a>
    </div>
    <div class="entity_details">
      <div class="entity_details_inheritors">
        Inheritors:
        <span v-if="modelType.subtypes.length == 0">(none)</span>
        <span v-for="(subtype, idx) in modelType.subtypes">
      <span class="entity_details_inheritors_inheritor"
            @click="navigateTo(subtype)">{{subtype.name}}</span><!--
   --><span v-if="isntLastInheritor(idx)">, </span>
    </span>
      </div>
      <div class="entity_details_properties">
        <entity-properties :modelType="modelType" v-if="modelType.properties.length > 0" @navigate="navigateTo($event)"></entity-properties>
      </div>
      <div v-for="ancestorType in modelType.ancestors" class="entity_details_properties">
        <div v-if="ancestorType.properties.length > 0">
          <div class="entity_property_header">
            Inherited from <span class="entity_property_header_link" @click="navigateTo(ancestorType)">{{ancestorType.name}}</span>:
          </div>
          <entity-properties :modelType="ancestorType" @navigate="navigateTo($event)"></entity-properties>
        </div>
      </div>
      <div class="entity_details_inbound_refs">
        Inbound references:
        <span v-if="modelType.inboundRefs.length == 0">(none)</span>
        <span v-for="(inboundRef, idx) in modelType.inboundRefs">
      <span @click="navigateTo(inboundRef.ownerType)" class="inbound_ref">{{inboundRef.ownerType.name}}.{{inboundRef.propName}}</span><!--
   --><span v-if="isntLastInboundRef(idx)">, </span>
    </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
  import Vue from "vue";
  import { Component, Prop, Watch } from 'vue-property-decorator';
  import {ModelType} from "../services/model-meta";
  import EntityProperties from "./entity-properties"

  @Component({
    components: {
      'entity-properties': EntityProperties
    }
  })
  export default class MapiEntity extends Vue {

    @Prop() modelType: ModelType;

    onRemoveClick() {
      this.$emit('remove');
    }

    navigateTo(name: string) {
      if (name) {
        this.$emit('navigate', name);
      }
    }

    isntLastInboundRef(index: number) {
      return index < this.modelType.inboundRefs.length - 1;
    }

    isntLastInheritor(index: number) {
      return index < this.modelType.subtypes.length - 1;
    }
  }
</script>

<style lang="scss">
  @import '../styling/material-palette';
  @import '../styling/main';

  .mapientity {
    border: $border;
    display: flex;
    flex-direction: column;
    border-radius: 5px;
    margin: 5px;

    .entity_header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      white-space: nowrap;

      border-bottom: $border;
      padding: 5px;

      .entity_header_name {
        font-weight: bold;
      }
      .entity_header_superclass {
        @include deEmphasize();
        .entity_header_superclass_name {
          @include linklike();
        }
      }

      .entity_remove_link {
        @include icon-mixin(cancel);
        @include linklike();
        background-color: palette(Red);
      }
    }

    .entity_details {
      overflow-y: auto;
      padding: 5px;

      .entity_details_inheritors {
        @include deEmphasize();
        .entity_details_inheritors_inheritor {
          @include linklike();
        }
      }

      .entity_details_properties {

        .entity_property_header {
          @include deEmphasize();
          .entity_property_header_link {
            @include linklike();
          }
        }

      }

      .entity_details_inbound_refs {
        @include deEmphasize();
        .inbound_ref {
          @include linklike();
        }
      }
    }
  }

</style>
