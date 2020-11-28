import classnames from 'classnames';
import GraphiQL from 'graphiql';
import { Fetcher } from 'graphiql/dist/components/GraphiQL';
import { GraphQLSchema } from 'graphql';
import React, { useCallback, useState } from 'react';

import GraphiQLTree from './GraphiQLTree';

import styles from './GraphiQLTree.module.scss';
import 'graphiql/graphiql.min.css';

export type { FetcherParams } from 'graphiql/dist/components/GraphiQL';

export interface GraphiQLWithTreeProps {
  customizeNode?: (params: any) => JSX.Element | void;
  fetcher: Fetcher;
  query?: string;
  schema?: GraphQLSchema;
}

const DEFAULT_QUERY =
  'query signUp {\n  signUp(company: { name: "" }) {\n    __typename\n  }\n}\n';

const GraphiQLWithTree: React.FC<GraphiQLWithTreeProps> = ({
  customizeNode,
  fetcher,
  query: defaultQuery,
  schema,
}) => {
  const [query, setQuery] = useState<string>(defaultQuery || DEFAULT_QUERY);
  const onEditQuery = useCallback((query?: string) => setQuery(query || ''), [setQuery]);

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
