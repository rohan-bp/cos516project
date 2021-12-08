import logo from './logo.svg';
import './App.css';
import Cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import CytoscapeComponent from 'react-cytoscapejs';
import React from 'react';
import {Row, Container, Col } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Editor from './Editor';

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
    this.state = {
      nodes: [
        { data: { id: 'one', label: 'A', description: 'Universal health care' } },
        { data: { id: 'two', label: 'B', description: 'Raise taxes' } },
        { data: { id: 'three', label: 'C', description: 'M4A' } },
      ],
      links: [
        { data: { source: 'one', target: 'two', label: 'Edge from Node1 to Node2' } },
        { data: { source: 'one', target: 'three', label: 'Edge from Node1 to Node3' } }
      ],
      curLabel: "C",
      currentDesc: "",
    }
    this.addChild = this.addChild.bind(this);
    this.resetGraph = this.resetGraph.bind(this);
    this.updateDesc = this.updateDesc.bind(this);
  }

  addChild(){
    // find selected element
    let selected = this.cy.nodes(':selected');
    if(selected.length > 0){
      let selectedNode = selected[0].data().id;
      this.setState((state) => {
        let newId = incrementLabel(state.curLabel);
        let newNode = {data: {id: newId, label: newId, description: state.currentDesc}};
        let newEdge = {data: {source: selectedNode, target: newId}};
        return {
          nodes: [...state.nodes, newNode],
          links: [...state.links, newEdge],
          curLabel: newId,
          currentDesc: ""
        }
      });
    }
  }

  updateDesc(event){
    this.setState({
      currentDesc: event.target.value,
    })
  }

  resetGraph(){
    // just a utility so i can undo editnig
    this.setState({
      nodes: [
        { data: { id: 'one', label: 'A', description: 'Universal health care' } },
        { data: { id: 'two', label: 'B', description: 'Raise taxes' } },
        { data: { id: 'three', label: 'C', description: 'M4A' } },
      ],
      links: [
        { data: { source: 'one', target: 'two', label: 'Edge from Node1 to Node2' } },
        { data: { source: 'one', target: 'three', label: 'Edge from Node1 to Node3' } }
      ],
      curLabel: "C",
      currentDesc: ""
    });
  }

  componentDidMount() {
    console.log("yay");
    this.cy.resize();
  }

  render() {
    const layout = { name: 'dagre', fit: true, padding: 90 };
    const style = {width:'100%', height: '100vh'};
    return (
      <div className="App">
        <Container fluid>
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
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}

export default App;
