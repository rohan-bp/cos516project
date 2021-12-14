
function NodeDefs(props) {
  let sorted = [...props.nodes];
  sorted.sort((first, second) => {
    return first.data.index - second.data.index;
  });
  const nodes = sorted.map((node) => <li key={node.data.id}>{node.data.label}: {node.data.description}</li>);

  return (
      <div>
        <h3 className="mt-3">Definitions</h3>
        <ul> {nodes} </ul>
      </div>
  )
}

export default NodeDefs;