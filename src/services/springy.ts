import * as _ from 'lodash';
/**
 * Springy v2.7.1
 *
 * Copyright (c) 2010-2013 Dennis Hotson
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the 'Software'), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

export class GraphChangeListener {
  constructor(public graphChanged: () => void) {}
}

export class Graph  {
  nodeSet: {[key: string]: Node} = {};
  nodes: Array<Node> = [];
  edges: Array<Edge> = [];
  // adjacency provides fast lookup of edges going node1 -> node2
  adjacency: {[sourceNodeId: string]: {[targetNodeId: string]: Array<Edge>}} = {};

  nextNodeId = 0;
  nextEdgeId = 0;
  eventListeners: Array<GraphChangeListener> = [];

  addNode(node: Node) {
    if (!(node.id in this.nodeSet)) {
      this.nodes.push(node);
    }

    this.nodeSet[node.id] = node;

    this.notify();
    return node;
  };

  addNodes(...nodes: Array<Node>) {
    // accepts variable number of arguments, where each argument
    // is a string that becomes both node identifier and label
    for(let node of nodes) {
      this.addNode(node);
    }
  }

  addEdge(edge: Edge) {
    let exists = false;
    this.edges.forEach(function(e) {
      if (edge.id === e.id) { exists = true; }
    });

    if (!exists) {
      this.edges.push(edge);
    }

    if (!(edge.source.id in this.adjacency)) {
      this.adjacency[edge.source.id] = {};
    }
    if (!(edge.target.id in this.adjacency[edge.source.id])) {
      this.adjacency[edge.source.id][edge.target.id] = [];
    }

    exists = false;
    this.adjacency[edge.source.id][edge.target.id].forEach((e) => {
      if (edge.id === e.id) { exists = true; }
    });

    if (!exists) {
      this.adjacency[edge.source.id][edge.target.id].push(edge);
    }

    this.notify();
    return edge;
  }

  addEdges() {
    // accepts variable number of arguments, where each argument
    // is a triple [nodeid1, nodeid2, attributes]
    for (let i = 0; i < arguments.length; i++) {
      let e = arguments[i];
      let node1 = this.nodeSet[e[0]];
      if (node1 === undefined) {
        throw new TypeError('invalid node name: ' + e[0]);
      }
      let node2 = this.nodeSet[e[1]];
      if (node2 === undefined) {
        throw new TypeError('invalid node name: ' + e[1]);
      }
      let attr = e[2];

      this.newEdge(node1, node2, attr);
    }
  }

  newNode(data: any) {
    let node = new Node('' + this.nextNodeId++, data);
    this.addNode(node);
    return node;
  }

  newEdge(source: Node, target: Node, data: any) {
    let edge = new Edge('' + this.nextEdgeId++, source, target, data);
    this.addEdge(edge);
    return edge;
  }

  // add nodes and edges from JSON object
  /**
   Springy's simple JSON format for graphs.

   historically, Springy uses separate lists
   of nodes and edges:

   {
           'nodes': [
               'center',
               'left',
               'right',
               'up',
               'satellite'
           ],
           'edges': [
               ['center', 'left'],
               ['center', 'right'],
               ['center', 'up']
           ]
       }

   **/
  //loadJSON(json: string | any) {
  //  // parse if a string is passed (EC5+ browsers)
  //  if (typeof json === 'string' || json instanceof String) {
  //    json = JSON.parse( json );
  //  }
  //
  //  if ('nodes' in json || 'edges' in json) {
  //    this.addNodes.apply(this, json['nodes']);
  //    this.addEdges.apply(this, json['edges']);
  //  }
  //}


  // find the edges from node1 to node2
  getEdges(node1: Node, node2: Node) {
    if (node1.id in this.adjacency
      && node2.id in this.adjacency[node1.id]) {
      return this.adjacency[node1.id][node2.id];
    }

    return [];
  }

  // remove a node and it's associated edges from the graph
  removeNode(node: Node) {
    if (node.id in this.nodeSet) {
      delete this.nodeSet[node.id];
    }

    for (let i = this.nodes.length - 1; i >= 0; i--) {
      if (this.nodes[i].id === node.id) {
        this.nodes.splice(i, 1);
      }
    }

    this.detachNode(node);
  }

  // removes edges associated with a given node
  detachNode(node: Node) {
    let tmpEdges = this.edges.slice();
    tmpEdges.forEach((e) => {
      if (e.source.id === node.id || e.target.id === node.id) {
        this.removeEdge(e);
      }
    }, this);

    this.notify();
  }

  // remove a node and it's associated edges from the graph
  removeEdge(edge: Edge) {
    for (let i = this.edges.length - 1; i >= 0; i--) {
      if (this.edges[i].id === edge.id) {
        this.edges.splice(i, 1);
      }
    }

    for (let x in this.adjacency) {
      for (let y in this.adjacency[x]) {
        let edges = this.adjacency[x][y];

        for (let j=edges.length - 1; j>=0; j--) {
          if (this.adjacency[x][y][j].id === edge.id) {
            this.adjacency[x][y].splice(j, 1);
          }
        }

        // Clean up empty edge arrays
        if (this.adjacency[x][y].length === 0) {
          delete this.adjacency[x][y];
        }
      }

      // Clean up empty objects
      if (isEmpty(this.adjacency[x])) {
        delete this.adjacency[x];
      }
    }

    this.notify();
  }

  /* Merge a list of nodes and edges into the current graph. eg.
   let o = {
   nodes: [
   {id: 123, data: {type: 'user', userid: 123, displayname: 'aaa'}},
   {id: 234, data: {type: 'user', userid: 234, displayname: 'bbb'}}
   ],
   edges: [
   {from: 0, to: 1, type: 'submitted_design', directed: true, data: {weight: }}
   ]
   }
   */
  //merge(data) {
  //  let nodes = [];
  //  data.nodes.forEach(function(n) {
  //    nodes.push(this.addNode(new Node(n.id, n.data)));
  //  }, this);
  //
  //  data.edges.forEach(function(e: Edge) {
  //    let from = nodes[e.from];
  //    let to = nodes[e.to];
  //
  //    let id = (e.directed)
  //      ? (id = e.type + '-' + from.id + '-' + to.id)
  //      : (from.id < to.id) // normalise id for non-directed edges
  //      ? e.type + '-' + from.id + '-' + to.id
  //      : e.type + '-' + to.id + '-' + from.id;
  //
  //    let edge = this.addEdge(new Edge(id, from, to, e.data));
  //    edge.data.type = e.type;
  //  }, this);
  //}

  filterNodes(fn: (node: Node) => boolean) {
    let tmpNodes = this.nodes.slice();
    tmpNodes.forEach((n) => {
      if (!fn(n)) {
        this.removeNode(n);
      }
    }, this);
  }

  filterEdges(fn: (edge: Edge) => boolean) {
    let tmpEdges = this.edges.slice();
    tmpEdges.forEach((e) => {
      if (!fn(e)) {
        this.removeEdge(e);
      }
    }, this);
  }

  addGraphListener(obj: GraphChangeListener) {
    this.eventListeners.push(obj);
  }

  notify() {
    this.eventListeners.forEach((obj) => {
      obj.graphChanged();
    });
  }
}

export class Node {

  constructor(public id: string, public data: any = {}) {}
  // Data fields used by layout algorithm in this file:
  // this.data.mass
  // Data used by default renderer in springyui.js
  // this.data.label
}

export class Edge {
  constructor(public id: string, public source: Node, public target: Node, public data: any = {}) { }
    // Edge data field used by layout alorithm
    // this.data.length
    // this.data.type
}

export class ForceDirectedLayout {
  nodePoints: {[nodeId: string]: Point} = {}; // keep track of points associated with nodes
  edgeSprings: {[edgeId: string]: Spring} = {}; // keep track of springs associated with edges

  timeToStop: boolean;
  started: boolean;

  constructor(
    public graph: Graph,
    public stiffness: number, // spring stiffness constant
    public repulsion: number, // repulsion constant
    public damping: number, // velocity damping factor
    public minEnergyThreshold: number = 0.01//threshold used to determine render stop
  ) {}

  point(node: Node) {
    if (!(node.id in this.nodePoints)) {
      let mass = (node.data.mass !== undefined) ? node.data.mass : 1.0;
      this.nodePoints[node.id] = new Point(Vector.random(), mass);
    }

    return this.nodePoints[node.id];
  }

  spring(edge: Edge) {
    if (!(edge.id in this.edgeSprings)) {
      let length = (edge.data.length !== undefined) ? edge.data.length : 1.0;

      let existingSpring: any = null;

      let from = this.graph.getEdges(edge.source, edge.target);
      from.forEach((e) => {
        if (!existingSpring && e.id in this.edgeSprings) {
          existingSpring = this.edgeSprings[e.id];
        }
      }, this);

      if (existingSpring) {
        return new Spring(existingSpring.point1, existingSpring.point2, 0.0, 0.0);
      }

      let to = this.graph.getEdges(edge.target, edge.source);
      to.forEach((e) => {
        if (!existingSpring && e.id in this.edgeSprings) {
          existingSpring = this.edgeSprings[e.id];
        }
      }, this);

      if (existingSpring) {
        return new Spring(existingSpring.point2, existingSpring.point1, 0.0, 0.0);
      }

      this.edgeSprings[edge.id] = new Spring(
        this.point(edge.source), this.point(edge.target), length, this.stiffness
      );
    }

    return this.edgeSprings[edge.id];
  }

  eachNode(callback: (node: Node, point: Point) => void) {
    this.graph.nodes.forEach((n) => {
      callback.call(this, n, this.point(n));
    });
  }

  eachEdge(callback: (edge: Edge, spring: Spring) => void) {
    this.graph.edges.forEach((e) => {
      callback.call(this, e, this.spring(e));
    });
  }

  // callback should accept one argument: Spring
  eachSpring(callback: (spring: Spring) => void) {
    this.graph.edges.forEach((e) => {
      callback.call(this, this.spring(e));
    });
  }

  // Physics stuff
  applyCoulombsLaw() {
    this.eachNode((n1: Node, point1: Point) => {
      this.eachNode((n2: Node, point2: Point) => {
        if (point1 !== point2) {
          let d = point1.p.subtract(point2.p);
          let distance = d.magnitude() + 0.1; // avoid massive forces at small distances (and divide by zero)
          let direction = d.normalise();

          // apply force to each end point
          point1.applyForce(direction.multiply(this.repulsion).divide(distance * distance * 0.5));
          point2.applyForce(direction.multiply(this.repulsion).divide(distance * distance * -0.5));
        }
      });
    });
  }

  applyHookesLaw() {
    this.eachSpring((spring) => {
      let d = spring.point2.p.subtract(spring.point1.p); // the direction of the spring
      let displacement = spring.length - d.magnitude();
      let direction = d.normalise();

      // apply force to each end point
      spring.point1.applyForce(direction.multiply(spring.k * displacement * -0.5));
      spring.point2.applyForce(direction.multiply(spring.k * displacement * 0.5));
    });
  }

  attractToCentre() {
    this.eachNode((node, point) => {
      let direction = point.p.multiply(-1.0);
      point.applyForce(direction.multiply(this.repulsion / 50.0));
    });
  }


  updateVelocity(timestep: number) {
    this.eachNode((node, point) => {
      // Is this, along with updatePosition below, the only places that your
      // integration code exist?
      point.v = point.v.add(point.a.multiply(timestep)).multiply(this.damping);
      point.a = new Vector(0,0);
    });
  }

  updatePosition(timestep: number) {
    this.eachNode((node, point) => {
      // Same question as above; along with updateVelocity, is this all of
      // your integration code?
      point.p = point.p.add(point.v.multiply(timestep));
    });
  }

  // Calculate the total kinetic energy of the system
  totalEnergy() {
    let energy = 0.0;
    this.eachNode((node, point) => {
      let speed = point.v.magnitude();
      energy += 0.5 * point.m * speed * speed;
    });

    return energy;
  }

  /**
   * Start simulation if it's not running already.
   * In case it's running then the call is ignored, and none of the callbacks passed is ever executed.
   */
  start(render: () => void, onRenderStop: () => void, onRenderStart: () => void) {

    if (this.started) return;
    this.started = true;
    this.timeToStop = false;

    if (onRenderStart !== undefined) { onRenderStart(); }

    let step = () => {
      this.tick(0.03);

      if (render !== undefined) {
        render();
      }

      // stop simulation when energy of the system goes below a threshold
      if (this.timeToStop || this.totalEnergy() < this.minEnergyThreshold) {
        this.started = false;
        if (onRenderStop !== undefined) { onRenderStop(); }
      } else {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  }

  stop() {
    this.timeToStop = true;
  }

  tick(timestep: number) {
    this.applyCoulombsLaw();
    this.applyHookesLaw();
    this.attractToCentre();
    this.updateVelocity(timestep);
    this.updatePosition(timestep);
  }

  // Find the nearest point to a particular position
  nearest(pos: Vector): any {
    let min: any = {node: null, point: null, distance: Number.MAX_SAFE_INTEGER};
    this.graph.nodes.forEach((n) => {
      let point = this.point(n);
      let distance = point.p.subtract(pos).magnitude();

      if (min.distance === null || distance < min.distance) {
        min = {node: n, point: point, distance: distance};
      }
    });

    return min;
  }

  getBoundingBox(): BoundingBox {
    let bottomleft = new Vector(1000,1000);
    let topright = new Vector(-1000,-1000);

    this.eachNode((n, point) => {
      if (point.p.x < bottomleft.x) {
        bottomleft.x = point.p.x;
      }
      if (point.p.y < bottomleft.y) {
        bottomleft.y = point.p.y;
      }
      if (point.p.x > topright.x) {
        topright.x = point.p.x;
      }
      if (point.p.y > topright.y) {
        topright.y = point.p.y;
      }
    });
    let padding = topright.subtract(bottomleft).multiply(0.07); // ~7% padding

    return {bottomLeft: bottomleft.subtract(padding), topRight: topright.add(padding)};
  }
}

export interface BoundingBox {
  bottomLeft: Vector;
  topRight: Vector;
}

  // Vector
export class Vector {

  static random() {
    return new Vector(10.0 * (Math.random() - 0.5), 10.0 * (Math.random() - 0.5));
  }

  constructor(public x:number, public y:number) {
  }

  add(v2: Vector) {
    return new Vector(this.x + v2.x, this.y + v2.y);
  }

  subtract(v2: Vector) {
    return new Vector(this.x - v2.x, this.y - v2.y);
  }

  multiply(n: number) {
    return new Vector(this.x * n, this.y * n);
  }

  divide(n: number) {
    return new Vector((this.x / n) || 0, (this.y / n) || 0); // Avoid divide by zero errors..
  }

  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normal() {
    return new Vector(-this.y, this.x);
  }

  normalise() {
    return this.divide(this.magnitude());
  }
}

export class Point {
  p: Vector;
  m: number;
  v: Vector;
  a: Vector;

  constructor(position: Vector, mass: number) {
    this.p = position; // position
    this.m = mass; // mass
    this.v = new Vector(0, 0); // velocity
    this.a = new Vector(0, 0); // acceleration
  }

  applyForce(force: Vector) {
    this.a = this.a.add(force.divide(this.m));
  }
}

export class Spring {
  constructor(
    public point1: Point,
    public point2: Point,
    public length: number,// spring length at rest
    public k: number // spring constant (See Hooke's law) .. how stiff the spring is
  ) {}
}

/**
 * Renderer handles the layout rendering loop
 * @param onRenderStop optional callback function that gets executed whenever rendering stops.
 * @param onRenderStart optional callback function that gets executed whenever rendering starts.
 */
export class Renderer {

  graphChanged = _.debounce(() => {
    this.start();
  }, 50);

  constructor(public layout: ForceDirectedLayout,
              public clear: () => void,
              public drawEdge: (edge: Edge, pos1: Vector, pos2: Vector) => void,
              public drawNode: (node: Node, post: Vector) => void,
              public onRenderStop: () => void,
              public onRenderStart: () => void) {
    this.layout.graph.addGraphListener(this);
  }

  /**
   * Starts the simulation of the layout in use.
   *
   * Note that in case the algorithm is still or already running then the layout that's in use
   * might silently ignore the call, and your optional <code>done</code> callback is never executed.
   * At least the built-in ForceDirected layout behaves in this way.
   *
   * @param done An optional callback function that gets executed when the springy algorithm stops,
   * either because it ended or because stop() was called.
   */
  start() {
    this.layout.start(() => {
      this.clear();

      this.layout.eachEdge((edge, spring) => {
        this.drawEdge(edge, spring.point1.p, spring.point2.p);
      });

      this.layout.eachNode((node, point) => {
        this.drawNode(node, point.p);
      });
    }, this.onRenderStop, this.onRenderStart);
  }

  stop() {
    this.layout.stop();
  }
}

function isEmpty(obj: any) {
  for (let k in obj) {
    if (obj.hasOwnProperty(k)) {
      return false;
    }
  }
  return true;
}
