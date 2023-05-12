import React, { useContext } from 'react';
import { Handle, Position } from 'reactflow';
import IfIcon from '../../../../../assets/images/icons/if.svg';
import { find } from 'lodash';
import './styles.scss';

import WorkflowEditorContext from '../../../context';
import DataSourceIcon from '../../DataSourceIcon';

function IfConditionNode(props) {
  const { editorSession, updateQuery } = useContext(WorkflowEditorContext);
  const { width, height, id, data: nodeData } = props;

  return (
    <div className="common-custom-node if-condition-node">
      <Handle
        type="target"
        position={Position.Left}
        isValidConnection={(connection) => connection.source === 'some-id'}
        onConnect={(params) => console.log('handle onConnect', params)}
        className="node-handle"
      />
      <Handle
        id="true"
        type="source"
        position={Position.Top}
        isValidConnection={(connection) => connection.source === 'some-id'}
        onConnect={(params) => console.log('handle onConnect', params)}
        style={{ background: 'lawngreen' }}
        className="node-handle"
      />
      <IfIcon />
      <span>If condition</span>
      <Handle
        id="false"
        type="source"
        position={Position.Bottom}
        isValidConnection={(connection) => connection.source === 'some-id'}
        onConnect={(params) => console.log('handle onConnect', params)}
        style={{ background: 'red' }}
        className="node-handle"
      />
    </div>
  );
}

export default IfConditionNode;