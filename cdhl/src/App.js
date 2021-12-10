import logo from './logo.svg';
import './App.css';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import Cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import CytoscapeComponent from 'react-cytoscapejs';
import React from 'react';
import {Row, Container, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Editor from './Editor';
import { firebase, db } from "./utils/firebase";

Cytoscape.use(dagre);

function incrementLabel(labelStr){
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
  } while(carry != 0 && curIndex >= 0);
  if(carry != 0) {
    chars = ["A", ...chars]
  }
  return chars.join('');
}

class App extends React.Component {
  constructor(props) {
    super(props);
    // this.state = {
    //   nodes: [
    //     { data: { id: 'A', label: 'A', description: 'Universal health care' } },
    //     { data: { id: 'B', label: 'B', description: 'Raise taxes' } },
    //     { data: { id: 'C', label: 'C', description: 'M4A' } },
    //   ],
    //   links: [
    //     { data: { source: 'A', target: 'B', label: 'Edge from Node1 to Node2' } },
    //     { data: { source: 'A', target: 'C', label: 'Edge from Node1 to Node3' } }
    //   ],
    //   curLabel: "C",
    //   currentDesc: "",
    // }
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
          console.log(node_info);
          nodes.push({data: {id: node_info.label, label: node_info.label, description: node_info.description, index: node_info.index}});
          if(node_info.index > curIdx) {
            curIdx = node_info.index;
            curLabel = node_info.label;
          }
        })

        const db_links = await db.collection("links").get();
        db_links.forEach((link) => {
          const link_info = link.data();
          links.push({data: {source: link_info.source, target: link_info.target}});
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
    if(selected.length > 0){
      let selectedNode = selected[0].data().id;
      let newId = incrementLabel(this.state.curLabel);
      let newNode = {data: {id: newId, label: newId, description: this.state.currentDesc}};
      let newEdge = {data: {source: selectedNode, target: newId}};
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
          const prop = db.collection("props").doc();
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
          const prop = db.collection("links").doc();
          await prop.set({
            source: selectedNode,
            target: newId
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

  updateDesc(event){
    this.setState({
      currentDesc: event.target.value,
    })
  }

  generateFormula(){
    let implications = {}
    // create mapping from ID to the consequences
    for(const link of this.state.links) {
      let source = link.data.source;
      let target = link.data.target;
      if(!(source in implications)) {
        implications[source] = [];
      }
      implications[source].push(target);
    }
    // now create string
    let formula = [];
    for(const source in implications){
      formula.push(`${source} → (${implications[source].join("&")})`);
    }
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

      let nodes = [
        { label: 'A', description: 'Universal health care', index: 0 },
        { label: 'B', description: 'Raise taxes', index: 1 },
        { label: 'C', description: 'Medicare for all', index: 2 },
      ];

      let links = [
        { source: 'A', target: 'B' },
        { source: 'A', target: 'C' }
      ];

      await nodes.forEach((node) => {
        const prop = db.collection("props").doc();
        prop.set({
          label: node.label,
          description: node.description,
          index: node.index
        }, {
          merge: true
        });
      });

      await links.forEach((link) => {
        const prop = db.collection("links").doc();
        prop.set({
          source: link.source,
          target: link.target
        }, {
          merge: true
        });
      });
    }
    wipe_db();

    // just a utility so i can undo editnig
    // this.setState({
    //   nodes: [
    //     { data: { id: 'A', label: 'A', description: 'Universal health care' } },
    //     { data: { id: 'B', label: 'B', description: 'Raise taxes' } },
    //     { data: { id: 'C', label: 'C', description: 'M4A' } },
    //   ],

    //   curLabel: "C",
    //   currentDesc: ""
    // });
  }

  // componentDidMount() {
  //   // console.log("yay");
  //   // this.cy.resize();
  // }

  render() {
    const layout = { name: 'dagre', fit: true, padding: 90 };
    const style = {width:'100%', height: '100vh'};
    return (
      <div className="App">
        <Container fluid>
        <BrowserRouter>
          <Switch>
            <Route path="/editor">
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
                  />
                </Col>
                <Col>
                  <Editor
                    addChild={this.addChild}
                    resetGraph={this.resetGraph}
                    nodes={this.state.nodes}
                    desc={this.state.currentDesc}
                    updateDesc={this.updateDesc}
                  />
                  <button onClick={this.generateFormula}>Generate Formula</button>
                </Col>
              </Row>
            </Route>
            <Route path="/bing">
              <h1>Bing</h1>
            </Route>
          </Switch>
        </BrowserRouter>
        </Container>
      </div>
    );
  }
}

export default App;
