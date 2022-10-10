import { DocumentNode, GraphQLSchema, OperationDefinitionNode, parse } from 'graphql';
import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ClipboardIcon from './icons/Clipboard';
import CodeExport from './CodeExport';
import DefaultValueCustomizer from './DefaultValueCustomizer';
import type { Fetcher } from '@graphiql/toolkit';
import GraphiQL from 'graphiql';
import GraphiQLTree from './GraphiQLTree';
import NodeCustomizer from './NodeCustomizer';
import Snippet from './snippets/Snippet';
import Tooltip from 'rc-tooltip';
import classnames from 'classnames';
import copy from 'copy-to-clipboard';
import { mergeDocumentNodeIntoVariables } from './graphqlHelper';
import styles from './GraphiQLWithTree.module.scss';

export interface GraphiQLWithTreeProps {
  context?: {
    [key: string]: any;
  };
  customizeDefaultValue?: DefaultValueCustomizer;
  customizeNode?: NodeCustomizer;
  fetcher: Fetcher;
  onChange?: (query?: string, variables?: string) => void;
  query?: string;
  readOnly?: boolean;
  schema?: GraphQLSchema;
  serverUrl: string;
  snippets?: Snippet[];
  variables?: string;
}

enum CodeMode {
  GraphQL = 'GraphQL',
  GraphQLVariables = 'GraphQLVariables',
}

const DEFAULT_DEFAULT_VALUE_CUSTOMIZER = () => undefined;
const DEFAULT_NODE_CUSTOMIZER = () => undefined;
const DEFAULT_QUERY = `query myQuery {
  __typename
}`;
const DEFAULT_VARIABLES = '{}';

const GraphiQLWithTree: React.FC<GraphiQLWithTreeProps> = ({
  context,
  customizeDefaultValue = DEFAULT_DEFAULT_VALUE_CUSTOMIZER,
  customizeNode = DEFAULT_NODE_CUSTOMIZER,
  fetcher,
  onChange,
  query: queryOverride,
  readOnly,
  schema,
  serverUrl,
  snippets,
  variables: variablesOverride,
}) => {
  const graphiqlRef = useRef(null);

  const [codeMode, setCodeMode] = useState<CodeMode | string>(CodeMode.GraphQL);
  const [exportCode, setExportCode] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [showCopiedTooltip, setShowCopiedTooltip] = useState<boolean>(false);
  const [variables, setVariables] = useState<string>(variablesOverride || DEFAULT_VARIABLES);

  const onEditQueryGraphiql = useCallback(
    (nextQueryString?: string) => {
      setQuery(nextQueryString || '');
      onChange?.(nextQueryString || '', variables);
    },
    [onChange, setQuery],
  );
  const onEditQueryTree = useCallback(
    (
      _prevQueryString: string,
      nextQueryString: string,
      _prevDocumentNode: DocumentNode,
      nextDocumentNode: DocumentNode,
    ) => {
      setQuery(nextQueryString || '');
      const nextVariables = mergeDocumentNodeIntoVariables(variables, nextDocumentNode);
      setVariables(nextVariables);
      onChange?.(nextQueryString || '', nextVariables);
    },
    [onChange, setQuery, setVariables, variables],
  );
  const onEditVariables = useCallback(
    (v?: string) => {
      setVariables(v || '');
      onChange?.(query, v || '');
    },
    [onChange, query, setVariables],
  );
  const parsedQuery = useMemo(() => {
    try {
      return parse(query);
    } catch (e) {
      return undefined;
    }
  }, [query]);

  useEffect(() => {
    setQuery(queryOverride || DEFAULT_QUERY);
  }, [customizeDefaultValue, queryOverride, schema]);

  useEffect(() => {
    setVariables(variablesOverride || DEFAULT_VARIABLES);
  }, [variablesOverride]);

  useEffect(() => {
    let nextExportCode = '';
    let safeVariables = 'MUST BE VALID JSON';
    try {
      safeVariables = JSON.parse(variables);
    } catch (e) {
      // Variables is probably not valid JSON
    }
    switch (codeMode) {
      case CodeMode.GraphQL:
        nextExportCode = query;
        break;
      case CodeMode.GraphQLVariables:
        // If we safely parsed it, format it. Otherwise copy as is.
        nextExportCode =
          safeVariables === 'MUST BE VALID JSON'
            ? variables
            : JSON.stringify(safeVariables, null, 2);
        break;
      default:
        const snippet = (snippets || []).find(({ name }) => codeMode === name);
        if (snippet) {
          nextExportCode = snippet.generate({
            context: {
              ...context,
              variables: safeVariables,
            },
            operationDefinition: parsedQuery?.definitions[0] as OperationDefinitionNode,
            serverUrl,
          });
        }
    }
    setExportCode(nextExportCode);
  }, [codeMode, context, parsedQuery, query, serverUrl, snippets, variables]);

  useEffect(() => {
    if (readOnly && (graphiqlRef.current as any)?.getQueryEditor()?.options?.readOnly === false) {
      (graphiqlRef.current as any).getQueryEditor().options.readOnly = true;
    }
  });

  const copyByCodeMode = () => {
    copy(exportCode);
    setShowCopiedTooltip(true);
    setTimeout(() => setShowCopiedTooltip(false), 1000);
  };
  const onCodeModeChange = (e: ChangeEvent<HTMLSelectElement>) => setCodeMode(e.target.value);
  const snippet = (snippets || []).find(({ name }) => codeMode === name);
  const hasSnippets = Array.isArray(snippets) && snippets.length > 0;
  const notGraphqlMode = ![
    CodeMode.GraphQL as string,
    CodeMode.GraphQLVariables as string,
  ].includes(codeMode);

  return (
    <div className={classnames(styles.graphiqlWithTree, 'graphiqlWithTree')}>
      <GraphiQLTree
        customizeDefaultValue={customizeDefaultValue}
        customizeNode={customizeNode}
        onEdit={onEditQueryTree}
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
            <div className={styles.mainBar}>
              <div>Request</div>
              <div className={classnames(styles.toolbar, 'toolBar')}>
                <button
                  className={styles.executeButton}
                  onClick={() => (graphiqlRef?.current as any)?.handleRunQuery()}
                >
                  <span style={{ fontSize: 11 }}>&#x25B6;</span> Run query
                </button>

                <Tooltip
                  overlay={showCopiedTooltip ? 'Copied!' : 'Click to copy'}
                  overlayClassName={styles.tooltip}
                  placement="left"
                >
                  <button className={styles.copyButton}>
                    <ClipboardIcon onClick={copyByCodeMode} />
                  </button>
                </Tooltip>
              </div>
            </div>
            <div className={styles.subBar}>
              <ul className={styles.subBarTabs}>
                <li
                  className={classnames({
                    [styles.active]: codeMode === CodeMode.GraphQL,
                  })}
                  onClick={() => setCodeMode(CodeMode.GraphQL)}
                >
                  Query
                </li>
                <li
                  className={classnames({
                    [styles.active]: codeMode === CodeMode.GraphQLVariables,
                  })}
                  onClick={() => setCodeMode(CodeMode.GraphQLVariables)}
                >
                  Variables
                </li>
                {hasSnippets && (
                  <li
                    className={classnames({
                      [styles.active]: notGraphqlMode,
                    })}
                    onClick={() => setCodeMode(snippets![0].name)}
                  >
                    Export
                  </li>
                )}
              </ul>
            </div>

            {hasSnippets && notGraphqlMode && (
              <div className={styles.subBarExports}>
                <label>
                  Code type
                  <div className={styles.select}>
                    <select onChange={onCodeModeChange} value={codeMode}>
                      {snippets!.map(({ name }) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </div>
            )}
          </div>
          <div
            className={classnames(styles.bottomContent, 'bottomContent', {
              [styles.variablesVisible]: codeMode === CodeMode.GraphQLVariables,
              [styles.exportCodeVisible]: notGraphqlMode,
            })}
          >
            <GraphiQL
              fetcher={fetcher}
              query={query}
              onEditQuery={onEditQueryGraphiql}
              onEditVariables={onEditVariables}
              ref={graphiqlRef}
              schema={schema}
              variables={variables}
            />
            {snippet && <CodeExport code={exportCode} mode={snippet.mode} theme="graphiql" />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraphiQLWithTree;
