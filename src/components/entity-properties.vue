<template>
  <ul v-if="modelType.properties.length > 0" class="entity-properties">
    <li v-for="(property, idx) in modelType.properties"
        class="entity_property"
        :class="{entity_property_odd: idx % 2 == 1}">
      <span class="entity_property_name">
        {{property.name}}: <!--
        --><span v-if="property.isNullable" class="entity_property_flag" title="Nullable">[?]</span><!--
        --><span v-if="property.isNotNull" class="entity_property_flag" title="Not null">[!]</span><!--
        --><span v-if="property.isImmutable" class="entity_property_flag" title="Immutable">[∞]</span>
      </span>
      <span class="entity_property_type"
            :class="{entity_property_type_navigation: property.referencedType}"
            @click="navigateTo(property.referencedType)"
            :title="property.description">
        {{property.description}}
      </span>
    </li>
  </ul>
</template>

<script lang="ts">
  import Vue from "vue";
  import { Component, Prop, Watch } from 'vue-property-decorator';
  import { ModelType } from "../services/model-meta";

  @Component
  export default class EntityProperties extends Vue {
    @Prop() modelType: ModelType;

    navigateTo(name: string) {
      if (name) {
        this.$emit('navigate', name);
      }
    }
  }
</script>

<style lang="scss">
  @import '../styling/main';

  .entity-properties {
    display: flex;
    flex-direction: column;
    overflow:hidden; // To avoid overlapping of border-radius corners

    border: $border;

    .entity_property {
      display: flex;
      justify-content: space-between;
      padding: 0 5px;

      &_odd {
        background-color: $propertyOddColor;
      }

      .entity_property_name {
        @include truncate();
        display: flex;
        align-items: center;
      }

      .entity_property_flag {
        font-size: 70%;
        color: darkgray;
        cursor: default;
      }

      .entity_property_type {
        @include deEmphasize();
        @include truncate();

        &_navigation {
          @include linklike();
        }
      }
    }}
</style>
