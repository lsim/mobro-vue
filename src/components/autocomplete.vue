<template>
  <div class="autocomplete">
    <input type="search" class="query-input"
           v-model="localValue"
           :placeholder="placeholder"
           @keydown="onKeydown($event)">
    <div class="click-overlay"
         @click="dismissSuggestions"
         v-if="suggestionsShown"></div>
    <ul class="suggestions" v-if="suggestionsShown">
      <li v-for="(item, index) in filteredList" :key="index"
          :class="{selected: highlightedIndex === index}">
        <a @click="select(item)" >{{item}}</a>
      </li>
    </ul>
  </div>
</template>
<script lang="ts">
  import Vue from "vue";
  import { Component, Prop, Watch } from 'vue-property-decorator';
  import * as _ from 'lodash'

  @Component
  export default class AutoComplete extends Vue {
    filteredList: string[] = [];
    suggestionsShown = false;

    highlightedIndex = 0;

    @Prop() placeholder: string;
    @Prop() options: string[];
    @Prop() value: string;
    localValue: string = "";

    escapeRegexChars(str: string): string {
      return str.replace(/\.|\*|\+|\?|\\|\^|\$|\(|\)|\[|\]|\{|\}/g, (regexChar: string) => '\\' + regexChar);
    }

    mounted() {
      this.localValue = this.value;
    }

    @Watch('localValue')
    onLocalValueChanged() {
      this.updateSuggestions();
    }
    @Watch('value')
    onValueChanged(newValue: string) {
      this.localValue = newValue;
    }

    updateSuggestions() {
      if(this.localValue) {
        let camelcaseMatcher = this.localValue
          .split('')
          .map((x:string) => this.escapeRegexChars(x))
          .join('[a-z]*');
        let regex = new RegExp(camelcaseMatcher);

        this.filteredList = this.options
          .map(o => <Relevancy>{option: o, search: o.search(regex)}) // add relevancy
          .filter((r: Relevancy) => r.search > -1) // filter out irrelevant
          .sort((r1,r2) => { return r1.search - r2.search; }) // sort by relevancy
          .map((r) => r.option); // remove relevancy

      } else {
        this.filteredList = [];
      }
      this.suggestionsShown = this.filteredList.length > 0;
      this.highlightedIndex = 0;
      this.$emit('input', this.localValue);
    }

    setNewValue(value: string) {
      this.localValue = value;
      this.$emit('input', this.localValue);
    }

    dismissSuggestions() {
      this.suggestionsShown = false;
    }

    select(item: string) {
      this.setNewValue(item);
      setTimeout(() => this.dismissSuggestions(), 10);
    }

    onKeydown(event: KeyboardEvent) {
      if(event.code === 'ArrowUp') {
        this.highlightedIndex--;
      } else if(event.code === 'ArrowDown') {
        this.highlightedIndex++;
      } else if(event.code === 'Enter' &&
        this.filteredList.length > this.highlightedIndex &&
        this.suggestionsShown) {
        this.select(this.filteredList[this.highlightedIndex]);
        // Return to let the enter press propagate!
        return;
      } else {
        return;
      }

      if(this.highlightedIndex < 0) {
        this.highlightedIndex = this.filteredList.length + this.highlightedIndex;
      } else if(this.highlightedIndex >= this.filteredList.length) {
        this.highlightedIndex = this.highlightedIndex - this.filteredList.length;
      }
      event.preventDefault();
    }

  }

  interface Relevancy {
    option: string;
    search: number;
  }
</script>
<style lang="scss">
  @import '../styling/material-palette';

  $zOffset: 1;

  .autocomplete {
    display: flex;
    position: relative;

    .click-overlay {
      opacity: 0.5;
      background-color: white;
      position: fixed;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      z-index: $zOffset;
    }

    .query-input {
      display: flex;
      width: 100%;
    }

    .suggestions {
      z-index: $zOffset + 1;
      display: inline-block; /*to get width by content*/
      position: absolute;
      left: 0;
      top: 100%;
      padding: 0;
      margin: 0;
      border: 1px solid black;
      color: black;

      background-color: white;


      li {
        list-style: none;
        cursor: pointer;
        border-bottom: 1px solid;
        margin: 0;
        padding: 3px;
        line-height: 20px;

        &.selected {
          background-color: palette(Light Blue);
        }
      }
    }
  }
</style>
