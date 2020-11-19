import classnames from 'classnames';
import GraphiQL from 'graphiql';
import { Fetcher } from 'graphiql/dist/components/GraphiQL';
import { GraphQLSchema } from 'graphql';
import React, { useCallback, useState } from 'react';

import GraphiQLTree from './GraphiQLTree';

import styles from './GraphiQLTree.module.scss';
import 'graphiql/graphiql.min.css';

export type { FetcherParams } from 'graphiql/dist/components/GraphiQL';

export interface GraphiQLWithExplorerProps {
  fetcher: Fetcher;
  schema?: GraphQLSchema;
}

const DEFAULT_QUERY =
  'mutation myEnums {\n  personAddress(primary: true, personId: "ABC123") {\n    address {\n      id\n      name\n      usTerritory\n    }\n    primary\n  }\n}\n';

const GraphiQLWithExplorer: React.FC<GraphiQLWithExplorerProps> = ({ fetcher, schema }) => {
  const [query, setQuery] = useState<string>(DEFAULT_QUERY);
  const onEditQuery = useCallback((query?: string) => setQuery(query || ''), [setQuery]);

  return (
    <div className={classnames('graphiql-container', styles.graphiqlTree)}>
      <GraphiQLTree onEdit={onEditQuery} query={query} schema={schema} />
      <GraphiQL fetcher={fetcher} query={query} onEditQuery={onEditQuery} schema={schema} />
    </div>
  );
};

export default GraphiQLWithExplorer;
