import React, { useState, useEffect } from 'react';
import { Button, Container } from 'react-bootstrap';
import { db } from "./utils/firebase";
import axios from "axios";
import swal from 'sweetalert';
import NodeDefs from './NodeDefs';

function PrefList(props) {
    const [prefs, setPrefs] = useState([]);
    const [prefFormulas, setPrefFormulas] = useState([]);
    const [incompatible, setIncompatible] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            const allPrefs = await db.collection("prefs").get();
            const prefList = [];
            let formulas = [];
            for(const pref of allPrefs.docs){
                const prefData = pref.data();
                const description = [];
                let formula = [];
                if(prefData.oppose.length > 0) {
                    description.push(`opposes ${prefData.oppose.join(", ")}`);
                    prefData.oppose.forEach((prop) => formula.push("~" + prop));
                }
                if(prefData.support.length > 0) {
                    description.push(`supports ${prefData.support.join(", ")}`);
                    prefData.support.forEach((prop) => formula.push(prop));
                }
                prefList.push(<p>{prefData.name} ({`${description.join(" & ")}`}) </p>);
                formulas.push({formula: formula.join(" & "), name: prefData.name});
            }
            setPrefs(prefList);
            setPrefFormulas(formulas);
        }
        fetchData();
    }, []);

    const findConflicts = async () => {
        // graph formula
        const obj = {"formulas": {}, "props": []};
        obj["formulas"]["formula"] = props.generateFormula();
        for(const userFormula of prefFormulas){
            obj["formulas"][userFormula["name"]] = userFormula["formula"];
        }
        obj["props"] = props.nodes.map((node) => node.data.id);
        const json = JSON.stringify(obj);
        const headers = {
            'Access-Control-Allow-Origin': '*',
            'Content-type': 'application/json',
        };
        const res = await axios.post("http://127.0.0.1:8080/unsat", json, {headers: headers});
        console.log(res);
        if(res.data.result === "Satisfiable"){
            swal({
                title: "Satisfiable!",
                text: "All user prefs are compatible with the policy.",
                icon: "success"
            });
        } else {
            const conflict = res.data.conflict;
            const userClauses = [];
            if("formula" in conflict){
                const policyClauses = conflict["formula"].join(" and ")
                userClauses.push({name: "Policy graph", clause: policyClauses})
            }

            for(const prop in conflict){
                if(prop !== "formula"){
                    userClauses.push({name: prop, clause: conflict[prop].join(" and ")});
                }
            }
            setIncompatible(userClauses);
        }
    }

    const displayConflict = incompatible.map((conflict) => <p>{conflict.name}: {conflict.clause}</p>);

    return (
      <Container className="mt-3">
        <NodeDefs nodes={props.nodes} />
        <h3>User-submitted Preferences</h3>
        {prefs}
        <Button onClick={findConflicts}>Find Conflicts</Button>
        {displayConflict.length > 0 ? <div> <h3 className="mt-2">Conflict:</h3> {displayConflict} </div> : <br/>}
      </Container>
    )
  }

  export default PrefList;