import classnames from 'classnames';
import { DocumentNode, GraphQLSchema, parse } from 'graphql';
import React, { useCallback, useEffect, useState } from 'react';

import { CustomNodeContext, SchemaContext } from './Context';
import Document from './Document';
import { transformDocumentNodeToQueryString } from './graphqlHelper';

import styles from './GraphiQLTree.module.scss';

import * as graphqlHelper from './graphqlHelper';
export { graphqlHelper };

interface GraphiQLTreeProps {
  customizeNode?: (params: any) => JSX.Element | void;
  onEdit: (queryString: string) => void;
  query: string;
  schema?: GraphQLSchema;
}

const DEFAULT_DOCUMENT: DocumentNode = {
  kind: 'Document',
  definitions: [],
};

function parseQuery(queryString: string): DocumentNode | undefined {
  try {
    return parse(queryString);
  } catch (error) {
    // We expect parsing errors as the user is typing
  }
}

export default React.memo(function GraphiQLTree({
  customizeNode = () => {},
  onEdit,
  query,
  schema,
}: GraphiQLTreeProps) {
  const [open, setOpen] = useState<boolean>(true);
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
    <div
      className={classnames('historyPaneWrap', styles.graphiqlTree)}
      style={{ ...(!open ? { display: 'none' } : {}) }}
    >
      <section aria-label="API Definition">
        <div className="history-title-bar">
          <div className="history-title">API Definition</div>
          <div className="doc-explorer-rhs">
            <button
              className="docExplorerHide"
              aria-label="Close History"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>
        </div>
        <div className="history-contents">
          {!schema && (
            <div className="spinner-container">
              <div className="spinner" />
            </div>
          )}
          {schema && (
            <SchemaContext.Provider value={schema}>
              <CustomNodeContext.Provider value={customizeNode}>
                <Document documentNode={documentNode} onEdit={onEditDocument} />
              </CustomNodeContext.Provider>
            </SchemaContext.Provider>
          )}
        </div>
      </section>
    </div>
  );
});
