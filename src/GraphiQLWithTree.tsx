import classnames from 'classnames';
import GraphiQL from 'graphiql';
import { Fetcher } from 'graphiql/dist/components/GraphiQL';
import { GraphQLSchema, OperationTypeNode } from 'graphql';
import React, { useCallback, useEffect, useState } from 'react';

import DefaultValueCustomizer from './DefaultValueCustomizer';
import GraphiQLTree from './GraphiQLTree';
import { generateDefaultQueryByQueryOrMutationName } from './graphqlHelper';
import NodeCustomizer from './NodeCustomizer';

import styles from './GraphiQLTree.module.scss';
import 'graphiql/graphiql.min.css';

export interface GraphiQLWithTreeProps {
  customizeDefaultValue?: DefaultValueCustomizer;
  customizeNode?: NodeCustomizer;
  fetcher: Fetcher;
  query?: string;
  schema?: GraphQLSchema;
}

const defaultApi = {
  name: 'personEmailAddress',
  operationType: 'mutation' as OperationTypeNode,
};

const GraphiQLWithTree: React.FC<GraphiQLWithTreeProps> = ({
  customizeDefaultValue = () => undefined,
  customizeNode = () => undefined,
  fetcher,
  query: defaultQuery,
  schema,
}) => {
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
  const onEditQuery = useCallback((query?: string) => setQuery(query || ''), [setQuery]);

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

  return (
    <div className={classnames('graphiql-container', styles.graphiqlTree)}>
      <GraphiQLTree
        customizeDefaultValue={customizeDefaultValue}
        customizeNode={customizeNode}
        onEdit={onEditQuery}
        query={query}
        schema={schema}
      />
      <GraphiQL fetcher={fetcher} query={query} onEditQuery={onEditQuery} schema={schema} />
    </div>
  );
};

export default GraphiQLWithTree;
