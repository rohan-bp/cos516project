import logo from './logo.svg';
import './App.css';
import Cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import CytoscapeComponent from 'react-cytoscapejs';
import React from 'react';

Cytoscape.use(dagre);

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      elements: [
        { data: { id: 'one', label: 'Universal health care' } },
        { data: { id: 'two', label: 'Raise taxes' } },
        { data: { id: 'three', label: 'M4A' } },
        { data: { source: 'one', target: 'two', label: 'Edge from Node1 to Node2' } },
        { data: { source: 'one', target: 'three', label: 'Edge from Node1 to Node3' } }
      ],
      numNodes: 3
    }
    this.addChild = this.addChild.bind(this);
  }

  addChild(){
    // find selected element
    let selected = this.cy.nodes(':selected');
    if(selected.length > 0){
      let selectedNode = selected[0].data().id;
      this.setState((state) => {
        let total = state.numNodes + 1;
        let newId = '' + total;
        let newNode = {data: {id: newId, label: 'Node ' + newId}};
        let newEdge = {data: {source: selectedNode, target: newId}};
        return {
          elements: [...state.elements, newNode, newEdge],
          numNodes: total,
        }
      });
    }
  }

  componentDidMount() {
    console.log("yay");
    this.cy.resize();
  }

  render() {
    const layout = { name: 'dagre', fit: true, padding: 90 };
    const style = {width:'800px', height: '500px'};
    return (
      <div className="App">
        <CytoscapeComponent
          cy={(cy) => {
            cy.on('add', 'node', _evt => {
                cy.layout(layout).run()
            });
            this.cy = cy;
          }}
          elements={this.state.elements}
          layout={layout}
          style={style}
        />
        <button onClick={this.addChild}>Add Child</button>
      </div>
    );
  }
}

export default App;
