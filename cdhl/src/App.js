import logo from './logo.svg';
import './App.css';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import Cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import CytoscapeComponent from 'react-cytoscapejs';
import React from 'react';
import {Row, Container, Col, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Editor from './Editor';
import UserPref from './UserPref';
import PrefList from './PrefList';
import { db } from "./utils/firebase";

Cytoscape.use(dagre);

function incrementLabel(labelStr){
  // increments label string from
  // "A" to "B" or "Z" to "AA"
  let chars = labelStr.split("");
  let curIndex = chars.length - 1;
  let carry = 0;
  do {
    let alphaCode = chars[curIndex].charCodeAt(0) + 1;
    if (alphaCode > 90) {
      carry = 1;
      chars[curIndex] = "A"
    } else {
      chars[curIndex] = String.fromCharCode(alphaCode);
    }
    curIndex -= 1;
  } while(carry !== 0 && curIndex >= 0);
  if(carry !== 0) {
    chars = ["A", ...chars]
  }
  return chars.join('');
}


function randomColor() {
  return "#" + Math.floor(Math.random()*16777215).toString(16);
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      nodes: [],
      links: [],
      curLabel: "",
      currentDesc: ""
    };
    this.addChild = this.addChild.bind(this);
    this.resetGraph = this.resetGraph.bind(this);
    this.updateDesc = this.updateDesc.bind(this);
    this.generateFormula = this.generateFormula.bind(this);
    this.addOrGroup = this.addOrGroup.bind(this);
    this.removeOr = this.removeOr.bind(this);
    this.deleteNode = this.deleteNode.bind(this);
  }

  componentDidMount() {
    const fetchData = async () => {
      try {
        let nodes = [];
        let links = [];
        let curIdx = -1;
        let curLabel = "";
        const db_nodes = await db.collection("props").get();
        db_nodes.forEach((node) => {
          const node_info = node.data();
          nodes.push({data: {id: node_info.label, label: node_info.label, description: node_info.description, index: node_info.index, dbId: node.id}});
          if(node_info.index > curIdx) {
            curIdx = node_info.index;
            curLabel = node_info.label;
          }
        })

        const db_links = await db.collection("links").get();
        db_links.forEach((link) => {
          const link_info = link.data();
          links.push({data: {source: link_info.source, target: link_info.target, color: link_info.color, dbId: link.id}});
        })

        this.setState({
          nodes: nodes,
          links: links,
          curLabel: curLabel,
          currentDesc: ""
        });
      }
      catch (error) {
        console.log("error", error);
      }
    }
    fetchData();
  }

  addChild(){
    // find selected element
    let selected = this.cy.nodes(':selected');
    const numNodes = this.state.nodes.length;
    const prop = db.collection("props").doc();
    const link = db.collection("links").doc();

    if(selected.length > 0){
      let selectedNode = selected[0].data().id;
      let newId = incrementLabel(this.state.curLabel);
      let newNode = {data: {id: newId, label: newId, description: this.state.currentDesc, dbId: prop.id}};
      let newEdge = {data: {source: selectedNode, target: newId, color: "gray", dbId: link.id}};
      this.setState((state) => {
        return {
          nodes: [...state.nodes, newNode],
          links: [...state.links, newEdge],
          curLabel: newId,
          currentDesc: ""
        }
      });

      // add to firebase
      const addProp = async () => {
        try {
          await prop.set({
            label: newId,
            description: this.state.currentDesc,
            index: numNodes
          }, {
            merge: true
          })
        } catch(error) {
          console.log("error", error);
        }
      }
      addProp();

      const addLink = async () => {
        try {
          await link.set({
            source: selectedNode,
            target: newId,
            color: "gray"
          }, {
            merge: true
          })
        } catch(error) {
          console.log("error", error);
        }
      }
      addLink();
    }
  }

  addOrGroup(){
    const selected = this.cy.edges(':selected');
    const groupColor = randomColor();
    this.setState((state) => {
      let linksCopy = [...state.links];
      let idToIdx = {};
      linksCopy.forEach((link, idx) => idToIdx[link.data.dbId] = idx);
      // find selected links
      selected.forEach(edge => {
        const dbId = edge.data().dbId;
        linksCopy[idToIdx[dbId]].data.color = groupColor;
        edge.unselect();
      })
      return {
        nodes: [...state.nodes],
        links: linksCopy,
        curLabel: state.curLabel,
        currentDesc: state.currentDesc
      }
    });

    // update firebase props
    const updateColor = async (dbId) => {
      try {
        const prop = db.collection("links").doc(dbId);
        await prop.set({
          color: groupColor
        }, {
          merge: true
        })
      } catch(error) {
        console.log("error", error);
      }
    }
    selected.forEach(edge => {
      const dbId = edge.data().dbId;
      updateColor(dbId);
    });
  }

  removeOr(){
    const selected = this.cy.edges(':selected');
    this.setState((state) => {
      let linksCopy = [...state.links];
      let idToIdx = {};
      linksCopy.forEach((link, idx) => idToIdx[link.data.dbId] = idx);
      // find selected links
      selected.forEach(edge => {
        const dbId = edge.data().dbId;
        linksCopy[idToIdx[dbId]].data.color = "gray";
        edge.unselect();
      })
      return {
        nodes: [...state.nodes],
        links: linksCopy,
        curLabel: state.curLabel,
        currentDesc: state.currentDesc
      }
    });

    // update firebase props
    const updateColor = async (dbId) => {
      try {
        const prop = db.collection("links").doc(dbId);
        await prop.set({
          color: "gray"
        }, {
          merge: true
        })
      } catch(error) {
        console.log("error", error);
      }
    }
    selected.forEach(edge => {
      const dbId = edge.data().dbId;
      updateColor(dbId);
    });
  }

  updateDesc(event){
    this.setState({
      currentDesc: event.target.value,
    })
  }

  generateFormula(){
    let implications = {}
    // we will find the root node using the two sets
    let allNodes = new Set();
    let hasParent = new Set();
    // create mapping from ID to the consequences
    for(const link of this.state.links) {
      let source = link.data.source;
      let target = link.data.target;
      allNodes.add(source);
      allNodes.add(target);
      hasParent.add(target);
      let color = link.data.color;
      if(!(source in implications)) {
        implications[source] = {};
      }
      if(!(color in implications[source])) {
        implications[source][color] = [];
      }
      implications[source][color].push(target);
    }
    // now create string
    let formula = [];
    for(const source in implications){
      let conjClauses = [];
      for(const color in implications[source]) {
        let joinSymbol = color === "gray" ? "&" : "|"; // accommodate or groups
        conjClauses.push(`(${implications[source][color].join(joinSymbol)})`);
      }
      formula.push(`${source} >> (${conjClauses.join("&")})`);
    }
    let root = Array.from(allNodes).filter(n => !hasParent.has(n))[0];
    formula.push(root);
    formula = formula.join(" & ")
    console.log(formula);
    return formula;
  }

  resetGraph(){
    const wipe_db = async () => {
      const db_nodes = await db.collection("props").get();
      db_nodes.forEach((val) => {
        db.collection("props").doc(val.id).delete();
      });
      const db_links = await db.collection("links").get();
      db_links.forEach((val) => {
        db.collection("links").doc(val.id).delete();
      });

      const nodes = [
        { label: 'A', description: 'Universal health care', index: 0 },
        { label: 'B', description: 'Raise taxes', index: 1 },
        { label: 'C', description: 'Divert spending', index: 2 },
        { label: 'D', description: 'Incur debt', index: 3 },
        { label: 'E', description: 'Medicare for all', index: 4 },
        { label: 'F', description: 'Medicaid for all', index: 5 },
        { label: 'G', description: 'Private insurance voucher system', index: 6 },
        { label: 'H', description: 'Increased demand', index: 7 },
        { label: 'I', description: 'Lower R&D funding', index: 8 },
        { label: 'J', description: 'Improved outcomes', index: 9 },
        { label: 'K', description: 'Corporate taxes', index: 10 },
        { label: 'L', description: 'Taxes on the wealthy', index: 11 },
        { label: 'M', description: 'Taxes on all households', index: 12 },
        { label: 'N', description: 'Longer wait times', index: 13 },
      ];

      const links = [
        { source: 'A', target: 'B', color: '#a846a0' },
        { source: 'A', target: 'C', color: '#a846a0'},
        { source: 'A', target: 'D', color: '#a846a0'},
        { source: 'A', target: 'E', color: '#43B929'},
        { source: 'A', target: 'F', color: '#43B929'},
        { source: 'A', target: 'G', color: '#43B929'},
        { source: 'A', target: 'H', color: 'gray'},
        { source: 'A', target: 'I', color: 'gray'},
        { source: 'A', target: 'J', color: 'gray'},
        { source: 'B', target: 'K', color: '#dc851f'},
        { source: 'B', target: 'L', color: '#dc851f'},
        { source: 'B', target: 'M', color: '#dc851f'},
        { source: 'H', target: 'N', color: 'gray'},
      ];

      await nodes.forEach((node) => {
        const prop = db.collection("props").doc();
        prop.set(node, {
          merge: true
        });
      });

      await links.forEach((link) => {
        const prop = db.collection("links").doc();
        prop.set(link, {
          merge: true
        });
      });
    }
    wipe_db();
  }

  deleteNode(){
    let selected = this.cy.nodes(':selected');

    if(selected.length === 1){
      let selectedNode = selected[0].data().id;
      let idChildren = {};
      let incomingLinks = {};
      let idToDbId = {};
      for(const node of this.state.nodes) {
        idToDbId[node.data.id] = node.data.dbId;
      }
      // make map of id to all child id by processing link structure
      // also, map from node to all incoming links
      for(const link of this.state.links) {
        if(!(link.data.source in idChildren)){
          idChildren[link.data.source] = [];
        }
        idChildren[link.data.source].push(link.data.target);

        if(!(link.data.target in incomingLinks)){
          incomingLinks[link.data.target] = [];
        }
        incomingLinks[link.data.target].push(link.data.dbId);
      }

      let nodesToDelete = new Set();
      let linksToDelete = new Set();
      let nodeQueue = [selectedNode];
      while(nodeQueue.length > 0){ // BFS search
        let toDelete = nodeQueue.shift();
        nodesToDelete.add(idToDbId[toDelete]);
        if(toDelete in incomingLinks) incomingLinks[toDelete].forEach((linkId) => linksToDelete.add(linkId));
        if(toDelete in idChildren) idChildren[toDelete].forEach((nodeId) => nodeQueue.push(nodeId));
      }

      // delete from state
      this.setState((state) => {
        const nodesLeft = state.nodes.filter((node) => !(nodesToDelete.has(node.data.dbId)));
        const linksLeft = state.links.filter((link) => !(linksToDelete.has(link.data.dbId)));
        return {
          nodes: nodesLeft,
          links: linksLeft
        };
      });

      // delete from firebase database
      const propDB = db.collection("props");
      const linkDB = db.collection("links");
      const deleteNode = async (dbId) => {
        try {
          await propDB.doc(dbId).delete();
        } catch(error) {
          console.log("error", error);
        }
      }
      const deleteLink = async (dbId) => {
        try {
          await linkDB.doc(dbId).delete();
        } catch(error) {
          console.log("error", error);
        }
      }
      nodesToDelete.forEach((nodeDbId) => deleteNode(nodeDbId));
      linksToDelete.forEach((linkDbId) => deleteLink(linkDbId));
    }
  }

  render() {
    const layout = { name: 'dagre', fit: true, padding: 90 };
    const style = {width:'100%', height: '100vh'};
    const stylesheet= [
      {
        selector: "node",
        style: {
          label: "data(label)",
          color: "black",
          "text-outline-color": "white",
          "text-outline-width": "2px",
        }
      },
      {
        selector: 'edge',
        style: {
          width: '3px',
          'line-color': 'data(color)',
        }
      },
      {
        selector: 'edge:selected',
        style: {
          width: '3px',
          'line-color': 'blue',
        }
      },
    ];
    return (
      <div className="App">
        <Container fluid>
        <BrowserRouter>
          <Switch>
            <Route path="/policy">
              <Row>
                <Col xs={8}>
                  <CytoscapeComponent
                    cy={(cy) => {
                      cy.on('add', 'node', _evt => {
                          cy.layout(layout).run()
                      });
                      this.cy = cy;
                    }}
                    elements={[...this.state.nodes, ...this.state.links]}
                    layout={layout}
                    style={style}
                    stylesheet={stylesheet}
                  />
                </Col>
                <Route path="/policy/edit">
                  <Col>
                    <Editor
                      addChild={this.addChild}
                      resetGraph={this.resetGraph}
                      addOrGroup={this.addOrGroup}
                      removeOr={this.removeOr}
                      deleteNode={this.deleteNode}
                      nodes={this.state.nodes}
                      desc={this.state.currentDesc}
                      updateDesc={this.updateDesc}
                    />
                    <button onClick={this.generateFormula}>Generate Formula</button>
                  </Col>
                </Route>
                <Route path="/policy/conflict">
                  <Col>
                    <PrefList
                      generateFormula={this.generateFormula}
                      nodes={this.state.nodes}
                    />
                  </Col>
                </Route>
              </Row>
            </Route>
            <Route path="/pref">
              <UserPref propList={this.state.nodes}/>
            </Route>
          </Switch>
        </BrowserRouter>
        </Container>
      </div>
    );
  }
}

export default App;
