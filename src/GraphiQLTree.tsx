import {
  DefaultValueCustomizerContext,
  DescriptionContext,
  NodeCustomizerContext,
  SchemaContext,
} from './Context';
import { DocumentNode, GraphQLSchema, parse } from 'graphql';
import React, { useCallback, useEffect, useState } from 'react';

import DefaultValueCustomizer from './DefaultValueCustomizer';
import Document from './Document';
import NodeCustomizer from './NodeCustomizer';
import classnames from 'classnames';
import styles from './GraphiQLTree.module.scss';
import { transformDocumentNodeToQueryString } from './graphqlHelper';

export interface GraphiQLTreeProps {
  customizeNode: NodeCustomizer;
  customizeDefaultValue: DefaultValueCustomizer;
  onEdit: (queryString: string) => void;
  query: string;
  schema?: GraphQLSchema;
}

const DEFAULT_DOCUMENT: DocumentNode = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: {
        kind: 'Name',
        value: 'myQuery',
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [],
      },
    },
  ],
};

function parseQuery(queryString: string): DocumentNode | undefined {
  try {
    return parse(queryString);
  } catch (error) {
    // We expect parsing errors as the user is typing
  }
}

export default React.memo(function GraphiQLTree({
  customizeNode,
  customizeDefaultValue,
  onEdit,
  query,
  schema,
}: GraphiQLTreeProps) {
  const [showDescription, setShowDescription] = useState<boolean>(true);
  const [documentNode, setDocumentNode] = useState<DocumentNode>(
    parseQuery(query) || DEFAULT_DOCUMENT,
  );

  const onEditDocument = useCallback(
    (_prevDocumentNode: DocumentNode, nextDocumentNode: DocumentNode) => {
      try {
        const nextQuery = transformDocumentNodeToQueryString(nextDocumentNode);
        onEdit(nextQuery);
      } catch (error) {
        /**
         * It's possible that we have an invalid DocumentNode, e.g. change operationName to "123",
         * so we'll want to display that error in the Graphiql output screen.
         */
        console.error(error);
      }
    },
    [onEdit],
  );

  useEffect(() => {
    const nextDocumentNode = parseQuery(query);
    if (nextDocumentNode !== undefined) {
      setDocumentNode(nextDocumentNode);
    }
  }, [query]);

  return (
    <div className={classnames('apiDefinition', styles.graphiqlTree)}>
      <div className={classnames('toolbar', styles.toolbar)}>
        <label className={styles.showDescription}>
          <input
            type="checkbox"
            checked={showDescription}
            onChange={() => setShowDescription(!showDescription)}
          />
          Description
        </label>
      </div>
      {schema && (
        <SchemaContext.Provider value={schema}>
          <DescriptionContext.Provider value={showDescription}>
            <NodeCustomizerContext.Provider value={customizeNode}>
              <DefaultValueCustomizerContext.Provider value={customizeDefaultValue}>
                <Document documentNode={documentNode} onEdit={onEditDocument} />
              </DefaultValueCustomizerContext.Provider>
            </NodeCustomizerContext.Provider>
          </DescriptionContext.Provider>
        </SchemaContext.Provider>
      )}
    </div>
  );
});
