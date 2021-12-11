import React, { useState, useEffect } from 'react';
import { Button, Container } from 'react-bootstrap';

function Editor(props) {
  let sorted = [...props.nodes];
  sorted.sort((first, second) => {
    return first.data.index - second.data.index;
  });
  const nodes = sorted.map((node) => <li key={node.id}>{node.data.label}: {node.data.description}</li>);

  return (
    <div>
      <h3>Definitions</h3>
      <ul> {nodes} </ul>

      <h3>Create new node</h3>
      <p>Click the appropriate parent node, type the description, and then click "Add child."</p>
      <input value={props.desc} onChange={props.updateDesc}/>
      <Button onClick={props.addChild}>Add Child</Button>
      <Button onClick={props.resetGraph}>Reset Graph</Button>
    </div>
  )
}

export default Editor;