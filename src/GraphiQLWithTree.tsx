import classnames from 'classnames';
import GraphiQL from 'graphiql';
import { Fetcher } from 'graphiql/dist/components/GraphiQL';
import { GraphQLSchema } from 'graphql';
import React, { useCallback, useEffect, useState } from 'react';

import GraphiQLTree from './GraphiQLTree';
import { generateDefaultQueryByQueryOrMutationName } from './graphqlHelper';

import styles from './GraphiQLTree.module.scss';
import 'graphiql/graphiql.min.css';

export interface GraphiQLWithTreeProps {
  customizeNode?: (params: any) => JSX.Element | void;
  fetcher: Fetcher;
  query?: string;
  schema?: GraphQLSchema;
}

const defaultApi = 'signUp';

const GraphiQLWithTree: React.FC<GraphiQLWithTreeProps> = ({
  customizeNode,
  fetcher,
  query: defaultQuery,
  schema,
}) => {
  const [query, setQuery] = useState<string>(
    defaultQuery ||
      (schema && generateDefaultQueryByQueryOrMutationName({ name: defaultApi, schema })) ||
      '',
  );
  const onEditQuery = useCallback((query?: string) => setQuery(query || ''), [setQuery]);

  useEffect(() => {
    setQuery(
      defaultQuery ||
        (schema && generateDefaultQueryByQueryOrMutationName({ name: defaultApi, schema })) ||
        '',
    );
  }, [defaultQuery, schema]);

  return (
    <div className={classnames('graphiql-container', styles.graphiqlTree)}>
      <GraphiQLTree
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
