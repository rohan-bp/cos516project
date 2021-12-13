import React, { useState, useEffect } from 'react';
import { Button, Row, Col, Container } from 'react-bootstrap';

function Editor(props) {
  let sorted = [...props.nodes];
  sorted.sort((first, second) => {
    return first.data.index - second.data.index;
  });
  const nodes = sorted.map((node) => <li key={node.data.id}>{node.data.label}: {node.data.description}</li>);

  return (
    <Container style={{"overflow-y": "scroll", "height": "90vh"}}>
      <h3 className="mt-3">Definitions</h3>
      <ul> {nodes} </ul>

      <h3>Create new node</h3>
      <p>Click the appropriate parent node, type the description, and then click "Add child."</p>
      <Row>
        <Col xs={8}>
          <input value={props.desc} onChange={props.updateDesc}/>
        </Col>
        <Col>
          <Button onClick={props.addChild}>Add Child</Button>
        </Col>
      </Row>

      <Row className="my-2">
        <Col xs={8}>
          <p>Delete node and all children.</p>
        </Col>
        <Col>
          <Button onClick={props.deleteNode}>Delete</Button>
        </Col>
      </Row>


      <Row className="my-2">
        <Col xs={8}>
          <p>Resets graph to default healthcare settings.</p>
        </Col>
        <Col>
          <Button onClick={props.resetGraph}>Reset Graph</Button>
        </Col>
      </Row>

      <h3>Add "or" clauses</h3>
      <p>By default, children with the gray links to the parent will all be true when the parent is true. However, you may want the relationship between some children and the parent to be such that at least one child is true when the parent is true (e.g., funding a new policy requires at least one of several funding options).</p>

      <Row className="my-2">
      <Col xs={8}>
          <p>Shift+click on appropriate edges (with the same parent node) and then click the button.</p>
        </Col>
        <Col>
          <Button onClick={props.addOrGroup}>Or Group</Button>
        </Col>
      </Row>
      <Row className="my-2">
      <Col xs={8}>
          <p>Shift+click on appropriate edges and click the button to return the nodes to an "and" relationship.</p>
        </Col>
        <Col>
          <Button onClick={props.removeOr}>Remove Or</Button> <br/>
        </Col>
      </Row>
    </Container>
  )
}

export default Editor;