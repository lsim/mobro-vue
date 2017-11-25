<template>
  <div class="typegraph">
    <svg viewBox="0 0 1000 1000" class="typegraph__canvas">
      <defs><!-- The arrow heads. refX is the offset from the end of the line to the edge of the target node -->
        <marker id="inheritance-arrow"
                markerWidth="10"
                markerHeight="10"
                refX="20"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z"
                class="inheritance_arrow"></path>
        </marker>
        <marker id="aggregation-arrow"
                markerWidth="10"
                markerHeight="10"
                refX="20"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth">
          <path d="M0,0 L0,6 L9,3 z"
                class="aggregation_arrow"></path>
        </marker>
      </defs>
      <!-- The edges first (under the nodes) -->
      <line v-for="edge in graph.edges" :key="edge.id"
            :class="'edge edge--'+edge.data.type"
            :x1="edge.data.pos1.x" :y1="edge.data.pos1.y"
            :x2="edge.data.pos2.x" :y2="edge.data.pos2.y"
            :marker-end="'url('+locationPathname+'#'+edge.data.type+'-arrow)'"></line>
      <!-- all edge labels -->
      <text v-for="edge in graph.edges" :key="edge.id"
            text-anchor="middle"
            :x="edge.data.labelPos.x"
            :y="edge.data.labelPos.y">
        <tspan v-for="(label, index) in edge.data.labels"
               :dy="index === 0 ? '' : '1em'" :dx="index === 0 ? '' : '-5em'">{{label}}</tspan>
      </text>
      <!-- Now all the nodes -->
      <g v-for="node in graph.nodes" :key="node.id"
         :transform="node.data.transform"
         @mousedown="mouseDownHandler(node, $event)"
         @click="onClick(node, $event)">
        <circle
          :r="nodeSize/2"
          :class="'typegraph__node ' + (node.data.isPrimary ? 'typegraph__node--primary' : '')"></circle>
        <text text-anchor="middle" class="typegraph__canvas__node-label">{{node.data.modelType.name}}</text>
      </g>
    </svg>
  </div>
</template>
<script lang="ts">
  import { Node, BoundingBox, Edge, ForceDirectedLayout, Graph, Renderer, Vector } from "../services/springy";
  import { ModelType } from "../services/model-meta";
  import { Prop, Component, Watch } from "vue-property-decorator";
  import Vue from "vue";

  @Component
  export default class TypeGraphComponent extends Vue {

    renderer: Renderer;
    graph: Graph = new Graph();
    layout: ForceDirectedLayout = new ForceDirectedLayout(this.graph, 1000, 100, 0.2, 2);

    canvas: { width: number, height: number } = { width: 1000, height: 1000 };
    nodeSize: number = 50;
    locationPathname: string;

    boundingBox: BoundingBox = <BoundingBox>{ bottomLeft: new Vector(0,0), topRight: new Vector(0,0)};

    @Prop({ default: true }) showAggregations: boolean;
    @Prop({ default: true }) showInheritance: boolean;
    @Prop({ default: [] }) modelTypes: Array<ModelType>;

    constructor() {
      super();
//      this.graph = new Graph();
//      this.layout = new ForceDirectedLayout(this.graph, 1000, 100, 0.2, 2);
      this.renderer = new Renderer(
        this.layout,
        this.clear,
        <(e: Edge, v1: Vector, v2: Vector) => void>this.drawEdge,
        <(n: Node, v: Vector) => void>this.drawNode,
        this.onRenderStop,
        this.onRenderStart
      );
    }

    // Drag handling
    mouseDownHandler(node: ANode, mouseDownEvent: MouseEvent) {
      const handleMouseUp = (mouseUpEvent: MouseEvent) => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        node.data.dragEnd();
      };
      const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
        node.data.drag({
          x: mouseMoveEvent.clientX - mouseDownEvent.x,
          y: mouseMoveEvent.clientY - mouseDownEvent.y
        });
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    @Watch('modelTypes', { deep: true })
    onModelTypesChange(newTypes: Array<ModelType>) {
      this.renderGraphFromNodes(newTypes);
    }

    mounted() {
      this.locationPathname = location.pathname; // TODO: workaround that may or may not be required still
      if (this.modelTypes.length > 0) {
        this.renderGraphFromNodes(this.modelTypes);
      }
    }

    addAggregationsForType(modelType: ModelType) {
      modelType.properties.forEach((property) => {
        if (property.referencedType) {
          this.addModelType(property.referencedType, false);
          let edgeLabel = property.name + (property.type === 'collection' ? '+' : '');
          this.addEdgeBetweenTypes(modelType, property.referencedType, 'aggregation', edgeLabel);
        }
      });
    }

    recursiveNodeRender(modelType: ModelType, isPrimary: boolean, childType: ModelType | null) {
      this.addModelType(modelType, isPrimary);
      if(this.showInheritance) {
        if(childType) {
          this.addEdgeBetweenTypes(childType, modelType, 'inheritance', '');
        }
        if(modelType.superType) {
          this.recursiveNodeRender(modelType.superType, false, modelType);
        }
      }
      if(this.showAggregations) {
        this.addAggregationsForType(modelType);
      }
    }

    renderGraphFromNodes(primaryTypes: Array<ModelType>) {
      this.clearGraph();
      primaryTypes.forEach((modelType) => {
        this.recursiveNodeRender(modelType, true, null);
      });
      this.renderer.start();
    }

    clearGraph() {
      this.graph.filterEdges((e) => false);
      this.graph.filterNodes((e) => false);
      this.layout.nodePoints = {};
      this.layout.edgeSprings = {};
    }

    edgeLookup(nodeId: string): {inbound: Array<Edge>, outbound: Array<Edge>} {
      const result = { inbound: <Array<Edge>>[], outbound: <Array<Edge>>[] };
      for(let edge of this.graph.edges) {
        if(edge.source.id === nodeId) {
          result.outbound.push(edge);
        }
        if(edge.target.id === nodeId) {
          result.inbound.push(edge);
        }
      }
      return result;
    }

    addModelType(modelType: ModelType, isPrimary: boolean) {
      const existingNode: Node = this.graph.nodeSet[modelType.name];
      if(this.graph.nodeSet[modelType.name] !== undefined) {
        existingNode.data.isPrimary |= <any>isPrimary;
        return;
      }
      const nodeData = new NodeData(
        modelType,
        (nodeId) => this.edgeLookup(nodeId),
        isPrimary,
        (newPos: Vector) => {
          let point = this.layout.nodePoints[modelType.name];
          if(point) {
            point.p = this.toGraphCoordinates(newPos);
            this.renderer.start();
          }
        }
      );
      const node: ANode = new Node(modelType.name, nodeData);
      this.graph.addNode(node);
    }

    addEdgeBetweenTypes(type1: ModelType, type2: ModelType, edgeType: string, edgeLabel: string) {
      const node1 = <ANode>this.graph.nodeSet[type1.name];
      const node2 = <ANode>this.graph.nodeSet[type2.name];
      if(node1 && node2) {
        this.addEdgeBetweenNodes(node1, node2, edgeType, edgeLabel);
      }
    }

    addEdgeBetweenNodes(node1: ANode, node2: ANode, edgeType: string, edgeLabel: string) {
      const id = `${node1.data.modelType.name}->${node2.data.modelType.name}`;
      const existingEdges = this.graph.getEdges(node1, node2);
      if(existingEdges.length > 0) {
        const existingEdge = existingEdges[0];
        existingEdge.data.addLabel(edgeLabel);
        return;
      }
      const edge: AnEdge = new Edge(id, node1, node2, new EdgeData(edgeType, edgeLabel));
      this.graph.addEdge(edge);
    }

    toUICoordinates(v: Vector): Vector {
      let bb = this.boundingBox;

      let bbSize = bb.topRight.subtract(bb.bottomLeft);
      if(bbSize.magnitude() === 0) { // Prevent divide by zero problem when there's only one node
        return new Vector(this.nodeSize, this.nodeSize);
      }
      let uiWidth = this.canvas.width;
      let uiHeight = this.canvas.height;

      let sx = (v.x - bb.bottomLeft.x) / bbSize.x * uiWidth;
      let sy = (v.y - bb.bottomLeft.y) / bbSize.y * uiHeight;

      return new Vector(sx, sy);
    }
    toGraphCoordinates(v: Vector) {
      let bb = this.boundingBox;
      let bbSize = bb.topRight.subtract(bb.bottomLeft);
      let uiWidth = this.canvas.width;
      let uiHeight = this.canvas.height;

      let sx = v.x/uiWidth * bbSize.x + bb.bottomLeft.x;
      let sy = v.y/uiHeight * bbSize.y + bb.bottomLeft.y;
      return new Vector(sx, sy);
    }

    onClick(node: Node, event: MouseEvent) {
      if(node.data.dragOffset.magnitude() === 0) {
        // Only fire event if it wasn't a drag
        this.$emit('nodeClicked', {modelType: node.data.modelType, event: event});
      }
    }

    clear() {
      this.boundingBox = this.layout.getBoundingBox();
    };
    drawEdge(edge: AnEdge, pos1: Vector, pos2: Vector) {
      edge.data.pos1 = this.toUICoordinates(pos1);
      edge.data.pos2 = this.toUICoordinates(pos2);
      edge.data.updateLabelPos();
    };
    drawNode(node: ANode, pos: Vector) {
      node.data.pos = this.toUICoordinates(pos);
      node.data.dragOffset = new Vector(0,0);
      node.data.updateTransform();
    };
    onRenderStart() {
      console.time('render');
    };
    onRenderStop() {
      console.timeEnd('render');
    };
  }

  class EdgeData {
    pos1 = new Vector(0,0);
    pos2 = new Vector(0,0);
    labelPos = new Vector(0,0);
    labels: Array<string> = [];
    constructor(public type: String, label: string) {
      this.addLabel(label);
    }

    addLabel(label: string) {
      for(let existingLabel of this.labels) {
        if(existingLabel === label) {
          return;
        }
      }
      this.labels.push(label);
    }

    setPos1(pos: Vector) {
      this.pos1 = pos;
      this.updateLabelPos();
    }
    setPos2(pos: Vector) {
      this.pos2 = pos;
      this.updateLabelPos();
    }
    updateLabelPos() {
      const edgeVector = this.pos2.subtract(this.pos1);
      const midpointFactor = 0.7;
      this.labelPos = edgeVector.multiply(midpointFactor).add(this.pos1);
    }
  }

  interface AnEdge extends Edge {
    data: EdgeData;
  }

  class NodeData {
    transform: string = '';
    pos: Vector = new Vector(0,0);
    dragOffset: Vector = new Vector(0,0);

    constructor(
      public modelType: ModelType,
      public edgeLookup: (nodeId: string) => ({inbound: Array<Edge>, outbound: Array<Edge>}),
      public isPrimary: boolean,
      public onPositionChange: (newPos: Vector) => void) {}

    drag(pos: {x: number, y: number}) {
      this.dragOffset = new Vector(pos.x,pos.y);
      this.updateTransform();
    }
    dragEnd() {
      this.pos = this.pos.add(this.dragOffset);
      this.dragOffset = new Vector(0,0);
      this.updateTransform();
      this.onPositionChange(this.pos);
    }
    updateTransform() {
      const p = this.pos.add(this.dragOffset);
      const edges = this.edgeLookup(this.modelType.name);
      edges.outbound.forEach((e) => e.data.setPos1(p));
      edges.inbound.forEach((e) => e.data.setPos2(p));
      this.transform = `translate(${p.x},${p.y})`;
    }
  }

  interface ANode extends Node {
    data: NodeData;
  }

</script>
<style lang="scss">
  @import '../styling/material-palette';

  $aggregationColor: palette(Purple);
  $inheritanceColor: black;
  $primaryNodeColor: palette(Orange);
  $secondaryNodeColor: palette(Green);

  .typegraph {

    position: relative;
    display: flex;

    .typegraph__canvas {
      width: 100%;

      .aggregation_arrow {
        stroke: $aggregationColor;
        fill: $aggregationColor;
      }

      .inheritance_arrow {
        stroke: $inheritanceColor;
        fill: $inheritanceColor;
      }

      .typegraph__node {
        stroke: $secondaryNodeColor;
        fill: white;
        stroke-width: 3;

        &--primary {
          stroke: $primaryNodeColor;
        }
      }

      &__node-label {
        cursor: pointer;
      }

      circle {
        cursor: pointer;
      }

      text {
        dominant-baseline: middle;
        user-select: none;
      }

      .edge {
        stroke-width: 2;

        &--aggregation {
          @extend .aggregation_arrow;
          stroke-dasharray: 2, 6;
        }

        &--inheritance {
          @extend .inheritance_arrow;
        }
      }
    }
  }
</style>
