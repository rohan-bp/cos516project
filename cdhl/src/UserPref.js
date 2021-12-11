import React, { useState } from 'react';
import { Button, Row, Col, Container } from 'react-bootstrap';
import { db } from "./utils/firebase";
import swal from 'sweetalert';

function UserPref(props) {
  const [support, setSupport] = useState([]);
  const [supportIds, setSupportIds] = useState([]);
  const [oppose, setOppose] = useState([]);
  const [opposeIds, setOpposeIds] = useState([]);


  const propsFull = (support.length + oppose.length) > 1;
  const atLeastOneProp = (support.length + oppose.length) > 0;
  const submitPrefs = async () => {
    try {
      const pref = db.collection("prefs").doc();
      await pref.set({
        support: supportIds,
        oppose: opposeIds,
      }, {
        merge: true
      });
      swal({
        title: "Done!",
        text: "Your preferences were submitted!",
        icon: "success"
      });
    } catch(error) {
      console.log("error", error);
    }
  }

  const proplist = props.propList.filter((node) => !(supportIds.includes(node.data.id) || opposeIds.includes(node.data.id))).map((node) => <Row key={node.data.id}>
        <Col xs={8}>
        <p>{node.data.description}</p>
        </Col>
        <Col>
          <Button disabled={propsFull ? true : null} onClick={() => {
            setSupportIds([...supportIds, node.data.id]);
            setSupport([...support, node]);
          }}>Support</Button>
          <Button disabled={propsFull ? true : null} onClick={() => {
            setOpposeIds([...opposeIds, node.data.id]);
            setOppose([...oppose, node]);
          }}>Oppose</Button>
        </Col>
    </Row>);

  const supportList = support.map((node) =>
    <p key={node.data.id}>{node.data.description} <Button onClick={() => {
      setSupport(support.filter((v) => v.data.id !== node.data.id));
      setSupportIds(supportIds.filter((v) => v !== node.data.id));
    }}>Reset</Button></p>
  );
  const opposeList = oppose.map((node) =>
  <p key={node.data.id}>{node.data.description} <Button onClick={() => {
    setOppose(oppose.filter((v) => v.data.id !== node.data.id));
    setOpposeIds(opposeIds.filter((v) => v !== node.data.id))
  }}>Reset</Button></p>
  );

  return (
    <Container>
      <Row>
        <Col xs={{ span: 8, offset: 2 }}>
          <h3>Submit Preferences</h3>
          <p>Pick up to five policy statements you feel strongly about.</p>
            { proplist }
          <Row>
            <Col xs={6}>
              <h3> Strongly support </h3>
              {supportList}
            </Col>
            <Col xs={6}>
              <h3> Strongly oppose </h3>
              {opposeList}
            </Col>
          </Row>
          <Button disabled={atLeastOneProp ? null : true} onClick={submitPrefs}>Submit prefs</Button>
        </Col>
      </Row>
    </Container>
  )
}

export default UserPref;