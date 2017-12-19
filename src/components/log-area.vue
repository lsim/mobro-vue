<template>
  <div class="logarea">
    <div v-for="(entry, index) in displayedEntries" 
         :class="'logentry__' + entry.type"
         :key="index">{{entry.message}}</div>
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

  @Prop() numLines: number;

  constructor() {
    super();
    let detachEvent = logService.entryLogged.attach((logEntry: LogEntry) => {
      this.displayedEntries.unshift(logEntry);
      if(this.displayedEntries.length > this.numLines) {
        this.displayedEntries.splice(this.numLines, this.displayedEntries.length - this.numLines);
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
  @import '../styling/material-palette';
  .logarea {

    .logentry {
      &__error {
        color: palette(Red)
      }

      &__message {
        color: palette(Green)
      }
    }
  }
</style>

