import CodeExporter, { computeOperationDataList } from 'graphiql-code-exporter';
import { GraphQLSchema, OperationTypeNode } from 'graphql';
import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';

import ClipboardIcon from './icons/Clipboard';
import CurlSnippet from './snippets/Curl';
import DefaultValueCustomizer from './DefaultValueCustomizer';
import { Fetcher } from 'graphiql/dist/components/GraphiQL';
import GraphiQL from 'graphiql';
import GraphiQLTree from './GraphiQLTree';
import NodeCustomizer from './NodeCustomizer';
import classnames from 'classnames';
import copy from 'copy-to-clipboard';
import { generateDefaultQueryByQueryOrMutationName } from './graphqlHelper';
import styles from './GraphiQLWithTree.module.scss';

export interface GraphiQLWithTreeProps {
  customizeDefaultValue?: DefaultValueCustomizer;
  customizeNode?: NodeCustomizer;
  fetcher: Fetcher;
  query?: string;
  schema?: GraphQLSchema;
  serverUrl: string;
}

const defaultApi = {
  name: 'signUp',
  operationType: 'mutation' as OperationTypeNode,
};

const GraphiQLWithTree: React.FC<GraphiQLWithTreeProps> = ({
  customizeDefaultValue = () => undefined,
  customizeNode = () => undefined,
  fetcher,
  query: defaultQuery,
  schema,
  serverUrl,
}) => {
  const graphiqlRef = useRef(null);
  const [codeMode, setCodeMode] = useState<string>('GraphQL');
  const [showCopiedTooltip, setShowCopiedTooltip] = useState<boolean>(false);
  const [query, setQuery] = useState<string>(
    defaultQuery ||
      (schema &&
        generateDefaultQueryByQueryOrMutationName({
          ...defaultApi,
          customizeDefaultValue,
          schema,
        })) ||
      '',
  );
  const hideCodeExporter = useCallback(() => setCodeMode('GraphQL'), []);
  const onEditQuery = useCallback((query?: string) => setQuery(query || ''), [setQuery]);
  const onCodeModeChange = (e: ChangeEvent<HTMLSelectElement>) => setCodeMode(e.target.value);

  useEffect(() => {
    setQuery(
      defaultQuery ||
        (schema &&
          generateDefaultQueryByQueryOrMutationName({
            ...defaultApi,
            customizeDefaultValue,
            schema,
          })) ||
        '',
    );
  }, [customizeDefaultValue, defaultQuery, schema]);

  const copyByCodeMode = () => {
    try {
      let snippet = query;
      if (codeMode !== 'GraphQL') {
        const { operationDataList } = computeOperationDataList({ query, variables: {} });
        switch (codeMode) {
          case 'cURL':
            snippet = CurlSnippet.generate({ operationDataList, serverUrl });
            break;
        }
      }
      copy(snippet);
      setShowCopiedTooltip(true);
      setTimeout(() => setShowCopiedTooltip(false), 1000);
    } catch (e) {
      console.warn('Could not parse invalid query');
    }
  };

  return (
    <div className={styles.graphiqlWithTree}>
      <GraphiQLTree
        customizeDefaultValue={customizeDefaultValue}
        customizeNode={customizeNode}
        onEdit={onEditQuery}
        query={query}
        schema={schema}
      />
      <div className={styles.interactiveInterfaceContainer}>
        <div className={styles.interactiveInterfaceContent}>
          <div className={styles.topBar}>
            <div>Request</div>
            <div className={styles.toolbar}>
              <button
                className={styles.executeButton}
                onClick={() => (graphiqlRef?.current as any)?.handleRunQuery()}
              >
                <span style={{ fontSize: 11 }}>&#x25B6;</span> Run query
              </button>
              <div>
                <div className={styles.select}>
                  <select onChange={onCodeModeChange} value={codeMode}>
                    <option value="GraphQL">GraphQL</option>
                    <option value="cURL">cURL</option>
                  </select>
                </div>
              </div>
              <button className={styles.copyButton}>
                <div
                  style={{
                    position: 'absolute',
                    top: '-25px',
                    left: '-22px',
                    fontSize: 'small',
                    padding: '6px 8px',
                    color: '#fff',
                    textAlign: 'left',
                    textDecoration: 'none',
                    wordWrap: 'break-word',
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    borderRadius: '4px',
                    lineHeight: 'normal',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    display: showCopiedTooltip ? 'block' : 'none',
                    pointerEvents: 'none',
                  }}
                >
                  Copied!
                </div>
                <ClipboardIcon onClick={copyByCodeMode} title="Click to copy" />
              </button>
            </div>
          </div>
          <div className={styles.bottomContent}>
            <GraphiQL
              fetcher={fetcher}
              query={query}
              onEditQuery={onEditQuery}
              ref={graphiqlRef}
              schema={schema}
            />
            <div
              className={classnames(styles.codeExporter, {
                [styles.hidden]: codeMode === 'GraphQL',
              })}
            >
              <CodeExporter
                codeMirrorTheme="graphiql"
                key={codeMode}
                hideCodeExporter={hideCodeExporter}
                snippets={[CurlSnippet]}
                serverUrl={serverUrl}
                query={query}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphiQLWithTree;
