import 'graphiql/graphiql.css';

import { GraphQLSchema, OperationDefinitionNode, OperationTypeNode, parse } from 'graphql';
import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ClipboardIcon from './icons/Clipboard';
import CodeExport from './CodeExport';
import DefaultValueCustomizer from './DefaultValueCustomizer';
import { Fetcher } from 'graphiql/dist/components/GraphiQL';
import GraphiQL from 'graphiql';
import GraphiQLTree from './GraphiQLTree';
import NodeCustomizer from './NodeCustomizer';
import Snippet from './snippets/Snippet';
import classnames from 'classnames';
import copy from 'copy-to-clipboard';
import { generateDefaultQueryByQueryOrMutationName } from './graphqlHelper';
import styles from './GraphiQLWithTree.module.scss';

export interface GraphiQLWithTreeProps {
  context?: {
    [key: string]: any;
  };
  customizeDefaultValue?: DefaultValueCustomizer;
  customizeNode?: NodeCustomizer;
  fetcher: Fetcher;
  query?: string;
  schema?: GraphQLSchema;
  serverUrl: string;
  snippets?: Snippet[];
}

enum CodeMode {
  GraphQL,
}

const DEFAULT_API = {
  name: 'signUp',
  operationType: 'mutation' as OperationTypeNode,
};
const DEFAULT_DEFAULT_VALUE_CUSTOMIZER = () => undefined;
const DEFAULT_NODE_CUSTOMIZER = () => undefined;

const GraphiQLWithTree: React.FC<GraphiQLWithTreeProps> = ({
  context,
  customizeDefaultValue = DEFAULT_DEFAULT_VALUE_CUSTOMIZER,
  customizeNode  = DEFAULT_NODE_CUSTOMIZER,
  fetcher,
  query: queryOverride,
  schema,
  serverUrl,
  snippets,
}) => {
  const graphiqlRef = useRef(null);

  const [codeMode, setCodeMode] = useState<CodeMode | string>(CodeMode.GraphQL);
  const [exportCode, setExportCode] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [showCopiedTooltip, setShowCopiedTooltip] = useState<boolean>(false);

  const onEditQuery = useCallback((query?: string) => setQuery(query || ''), [setQuery]);
  const parsedQuery = useMemo(() => {
    try {
      return parse(query);
    } catch (e) {
      return undefined;
    }
  }, [query]);

  useEffect(() => {
    const newQuery =
      queryOverride ??
      (schema &&
        generateDefaultQueryByQueryOrMutationName({
          ...DEFAULT_API,
          customizeDefaultValue,
          schema,
        }));
    setQuery(newQuery || '');
  }, [customizeDefaultValue, queryOverride, schema]);

  useEffect(() => {
    const snippet = (snippets || []).find(({ name }) => codeMode === name);
    if (snippet) {
      setExportCode(
        snippet.generate({
          context,
          operationDefinition: parsedQuery?.definitions[0] as OperationDefinitionNode,
          serverUrl,
        }),
      );
    }
  }, [codeMode, parsedQuery, serverUrl, snippets]);

  useEffect(() => {
    if ((graphiqlRef.current as any)?.getQueryEditor()?.options?.readOnly === false) {
      (graphiqlRef.current as any).getQueryEditor().options.readOnly = true;
    }
  }, [graphiqlRef.current]);

  const copyByCodeMode = () => {
    copy(exportCode);
    setShowCopiedTooltip(true);
    setTimeout(() => setShowCopiedTooltip(false), 1000);
  };
  const onCodeModeChange = (e: ChangeEvent<HTMLSelectElement>) => setCodeMode(e.target.value);
  const snippet = (snippets || []).find(({ name }) => codeMode === name);

  return (
    <div className={classnames(styles.graphiqlWithTree, 'graphiqlWithTree')}>
      <GraphiQLTree
        customizeDefaultValue={customizeDefaultValue}
        customizeNode={customizeNode}
        onEdit={onEditQuery}
        query={query}
        schema={schema}
      />
      <div
        className={classnames(
          styles.interactiveInterfaceContainer,
          'interactiveInterfaceContainer',
        )}
      >
        <div
          className={classnames(styles.interactiveInterfaceContent, 'interactiveInterfaceContent')}
        >
          <div className={classnames(styles.topBar, 'topBar')}>
            <div>Request</div>
            <div className={classnames(styles.toolbar, 'toolBar')}>
              <button
                className={styles.executeButton}
                onClick={() => (graphiqlRef?.current as any)?.handleRunQuery()}
              >
                <span style={{ fontSize: 11 }}>&#x25B6;</span> Run query
              </button>
              {snippets && (
                <div>
                  <div className={styles.select}>
                    <select onChange={onCodeModeChange} value={codeMode}>
                      <option value="GraphQL">GraphQL</option>
                      {snippets.map(({ name }) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
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
          <div className={classnames(styles.bottomContent, 'bottomContent')}>
            <GraphiQL
              fetcher={fetcher}
              query={query}
              onEditQuery={onEditQuery}
              ref={graphiqlRef}
              schema={schema}
            />
            {snippet && <CodeExport code={exportCode} mode={snippet.mode} theme="graphiql" />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphiQLWithTree;
