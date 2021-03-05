import 'graphiql/graphiql.css';
import 'rc-tooltip/assets/bootstrap.css';

import type {
  DocumentNode,
  GraphQLSchema,
  OperationDefinitionNode,
  OperationTypeNode,
} from 'graphql';
import React, { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ClipboardIcon from './icons/Clipboard';
import CodeExport from './CodeExport';
import DefaultValueCustomizer from './DefaultValueCustomizer';
import { Fetcher } from 'graphiql/dist/components/GraphiQL';
import GraphiQL from 'graphiql';
import GraphiQLTree from './GraphiQLTree';
import NodeCustomizer from './NodeCustomizer';
import Snippet from './snippets/Snippet';
import Tooltip from 'rc-tooltip';
import classnames from 'classnames';
import copy from 'copy-to-clipboard';
import {
  generateDefaultQueryByQueryOrMutationName,
  mergeDocumentNodeIntoVariables,
} from './graphqlHelper';
import { parse } from 'graphql';
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
  GraphQL = 'GraphQL',
  GraphQLVariables = 'GraphQLVariables',
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
  customizeNode = DEFAULT_NODE_CUSTOMIZER,
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
  const [variables, setVariables] = useState<string>('{}');

  const onEditQueryGraphiql = useCallback(
    (nextQueryString?: string) => setQuery(nextQueryString || ''),
    [setQuery],
  );
  const onEditQueryTree = useCallback(
    (
      _prevQueryString: string,
      nextQueryString: string,
      _prevDocumentNode: DocumentNode,
      nextDocumentNode: DocumentNode,
    ) => {
      setQuery(nextQueryString || '');
      setVariables(mergeDocumentNodeIntoVariables(variables, nextDocumentNode));
    },
    [setQuery, setVariables, variables],
  );
  const onEditVariables = useCallback((v?: string) => setVariables(v || ''), [setVariables]);
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
    if ((graphiqlRef.current as any)?.getQueryEditor()?.options?.readOnly === false) {
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
