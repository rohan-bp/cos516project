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
import UserPref from './UserPref';
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
        { source: 'A', target: 'B', color: 'gray' },
        { source: 'A', target: 'C', color: 'gray'}
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
      // {
      //   selector: 'edge.or_group',
      //   style: {
      //     width: '4px',
      //     'line-color': 'data(linecolor)'
      //   }
      // }
    ];
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
                    stylesheet={stylesheet}
                  />
                </Col>
                <Col>
                  <Editor
                    addChild={this.addChild}
                    resetGraph={this.resetGraph}
                    addOrGroup={this.addOrGroup}
                    nodes={this.state.nodes}
                    desc={this.state.currentDesc}
                    updateDesc={this.updateDesc}
                  />
                  <button onClick={this.generateFormula}>Generate Formula</button>
                </Col>
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
