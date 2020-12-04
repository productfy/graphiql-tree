import { OperationDefinitionNode, OperationTypeNode, SelectionSetNode } from 'graphql';
import React, { ChangeEvent, useCallback, useContext, useEffect, useRef } from 'react';
import {
  mergeSelectionSetIntoOperationDefinition,
  sourcesAreEqual,
  updateOperationDefinition,
} from './graphqlHelper';

import { SchemaContext } from './Context';
import { Type } from './OutputType';
import classnames from 'classnames';
import styles from './GraphiQLTree.module.scss';

interface OperationProps {
  depth: number;
  onEdit: (
    prevOperationDefinitionNode: OperationDefinitionNode,
    nextOperationDefinitionNode: OperationDefinitionNode,
  ) => void;
  operationDefinitionNode: OperationDefinitionNode;
}

export default React.memo(function Operation({
  depth,
  onEdit,
  operationDefinitionNode,
}: OperationProps) {
  const operationDefinitionNodeRef = useRef(operationDefinitionNode);

  useEffect(() => {
    operationDefinitionNodeRef.current = operationDefinitionNode;
  }, [operationDefinitionNode]);

  const onEditOperation = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const isNameField = e.target.name === 'name';
    const nextName: string = isNameField
      ? e.target.value || ''
      : operationDefinitionNodeRef.current.name?.value || '';
    const nextOperation: OperationTypeNode = isNameField
      ? operationDefinitionNodeRef.current.operation
      : (e.target.value as OperationTypeNode);
    const nextOperationDefinitionNode = updateOperationDefinition(
      operationDefinitionNodeRef.current,
      {
        name: nextName,
        operation: nextOperation,
      },
    );
    onEdit(operationDefinitionNodeRef.current, nextOperationDefinitionNode);
  };

  const onEditType = useCallback(
    (prevSelectionSetNode?: SelectionSetNode, nextSelectionSetNode?: SelectionSetNode) => {
      const nextOperationDefinitionNode = mergeSelectionSetIntoOperationDefinition(
        operationDefinitionNodeRef.current,
        prevSelectionSetNode,
        nextSelectionSetNode,
      );
      onEdit(operationDefinitionNodeRef.current, nextOperationDefinitionNode);
    },
    [onEdit, operationDefinitionNodeRef],
  );

  const name = operationDefinitionNode.name?.value || '';
  const operation = operationDefinitionNode.operation;
  const schema = useContext(SchemaContext);
  const type =
    operation === 'query'
      ? schema?.getQueryType()
      : operation === 'mutation'
      ? schema?.getMutationType()
      : schema?.getSubscriptionType();

  return (
    <div className={classnames(styles.operation, `depth-${depth}`)}>
      <div className={classnames(styles.operationTypeAndName, 'operationTypeAndName')}>
        <span className="cm-keyword" style={{ display: 'inline-block', position: 'relative' }}>
          <div className={styles.operationInput}>
            <select name="operation" onChange={onEditOperation} value={operation}>
              <option>mutation</option>
              <option>query</option>
            </select>
          </div>
          {operation}
        </span>

        <span className="cm-ws">&nbsp;</span>

        <input
          type="text"
          name="name"
          onChange={onEditOperation}
          value={name}
          className={classnames('cm-def', styles.inputText, styles.operationName, {
            [styles.focusBorder]: name.length === 0,
          })}
          style={{ width: `calc(1px + ${name.length || 1}ch)` }}
        />

        {/* <span className="cm-punctuation">{' {'}</span> */}
      </div>

      {type && (
        <Type
          depth={depth + 1}
          key={operation}
          onEdit={onEditType}
          selectionSetNode={operationDefinitionNode.selectionSet}
          type={type}
        />
      )}

      {/* <div className="cm-punctuation">{'}'}</div> */}
    </div>
  );
},
sourcesAreEqual('operationDefinitionNode'));
