import { DefinitionNode, DocumentNode, OperationDefinitionNode } from 'graphql';
import React, { useCallback, useEffect, useRef } from 'react';

import { mergeOperationDefinitionIntoDocument, sourcesAreEqual } from './graphqlHelper';
import Operation from './Operation';

interface DocumentProps {
  documentNode: DocumentNode;
  onEdit: (prevDocumentNode: DocumentNode, nextDocumentNode: DocumentNode) => void;
}

const NODE_DEPTH = 1;

export default React.memo(function Document({ documentNode, onEdit }: DocumentProps) {
  const documentNodeRef = useRef(documentNode);

  useEffect(() => {
    documentNodeRef.current = documentNode;
  }, [documentNode]);

  const onEditOperation = useCallback(
    (
      prevOperationDefinitionNode: OperationDefinitionNode,
      nextOperationDefinitionNode: OperationDefinitionNode,
    ) => {
      const nextDocumentNode = mergeOperationDefinitionIntoDocument(
        documentNodeRef.current,
        prevOperationDefinitionNode,
        nextOperationDefinitionNode,
      );
      onEdit(documentNodeRef.current, nextDocumentNode);
    },
    [documentNodeRef, onEdit],
  );

  const definitions: readonly DefinitionNode[] = documentNode.definitions;

  return (
    <div className={`depth-${NODE_DEPTH}`}>
      {definitions.map((definition, index) => {
        if (definition.kind === 'OperationDefinition') {
          return (
            <Operation
              depth={NODE_DEPTH + 1}
              key={index}
              onEdit={onEditOperation}
              operationDefinitionNode={definition}
            />
          );
        }
        return <div key={index} />;
      })}
    </div>
  );
}, sourcesAreEqual('documentNode'));
