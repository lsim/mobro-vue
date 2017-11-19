<template>
  <div>
    <div v-for="entry in displayedEntries" v-bind:class="'logentry__' + entry.type">{{entry.message}}</div>
  </div>
</template>
<script lang="ts">
import Vue from "vue";
import { Component, Prop } from 'vue-property-decorator';
import logService, {LogEntry, LogService} from "../services/logger";

@Component
export default class LogAreaComponent extends Vue {
  displayedEntries: LogEntry[] = [];

  cleanup: (() => any)[] = [];

  @Prop() numLines: string;
  get numLinesNumber() { // Workaround to type error when prop is given 'number' type
    return parseInt(this.numLines, 10);
  }

  constructor() {
    super();
    let detachEvent = logService.entryLogged.attach((logEntry: LogEntry) => {
      this.displayedEntries.unshift(logEntry);
      if(this.displayedEntries.length > this.numLinesNumber) {
        this.displayedEntries.splice(this.numLinesNumber, this.displayedEntries.length - this.numLinesNumber);
      }
    });
    this.cleanup.push(detachEvent);
  }

  beforeDestroy() {
    this.cleanup.forEach((fn) => fn());
  }

}
</script>
<style lang="scss">

</style>

