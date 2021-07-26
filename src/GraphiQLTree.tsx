import type {
  DefaultValueCustomizer,
  DescriptionCustomizer,
  NodeCustomizer,
} from './CustomizerTypes';
import {
  DefaultValueCustomizerContext,
  DescriptionContext,
  DescriptionCustomizerContext,
  NodeCustomizerContext,
  SchemaContext,
} from './Context';
import type { DocumentNode, GraphQLSchema } from 'graphql';
import { memo, useCallback, useEffect, useState } from 'react';

import ComposeProviders from './ComposeProviders';
import Document from './Document';
import classnames from 'classnames';
import { parse } from 'graphql';
import styles from './GraphiQLTree.module.scss';
import { transformDocumentNodeToQueryString } from './graphqlHelper';

export interface GraphiQLTreeProps {
  customizeDefaultValue: DefaultValueCustomizer;
  customizeDescription: DescriptionCustomizer;
  customizeNode: NodeCustomizer;
  onEdit: (
    prevQueryString: string,
    nextQueryString: string,
    prevDocumentNode: DocumentNode,
    nextDocumentNode: DocumentNode,
  ) => void;
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

export default memo(function GraphiQLTree({
  customizeDefaultValue,
  customizeDescription,
  customizeNode,
  onEdit,
  query,
  schema,
}: GraphiQLTreeProps) {
  const [showDescription, setShowDescription] = useState<boolean>(true);
  const [documentNode, setDocumentNode] = useState<DocumentNode>(
    parseQuery(query) || DEFAULT_DOCUMENT,
  );

  const onEditDocument = useCallback(
    (prevDocumentNode: DocumentNode, nextDocumentNode: DocumentNode) => {
      try {
        const nextQuery = transformDocumentNodeToQueryString(nextDocumentNode);
        if (query !== nextQuery) {
          onEdit(query, nextQuery, prevDocumentNode, nextDocumentNode);
        }
      } catch (error) {
        /**
         * It's possible that we have an invalid DocumentNode, e.g. change operationName to "123",
         * so we'll want to display that error in the Graphiql output screen.
         */
        console.error(error);
      }
    },
    [onEdit, query],
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
        <ComposeProviders
          providers={[
            [DefaultValueCustomizerContext.Provider, customizeDefaultValue],
            [DescriptionContext.Provider, showDescription],
            [DescriptionCustomizerContext.Provider, customizeDescription],
            [NodeCustomizerContext.Provider, customizeNode],
            [SchemaContext.Provider, schema],
          ]}
        >
          <Document documentNode={documentNode} onEdit={onEditDocument} />
        </ComposeProviders>
      )}
    </div>
  );
});
