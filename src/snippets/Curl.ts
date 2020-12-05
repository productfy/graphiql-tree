import 'codemirror/mode/shell/shell';

import Snippet from './Snippet';
import graphqlQueryCompress from 'graphql-query-compress';
import { print } from 'graphql';

export default {
  name: 'cURL',
  mode: 'shell',
  generate: ({ operationDefinition, serverUrl }) => {
    const { name } = operationDefinition;
    const query = print(operationDefinition);

    return `curl -X POST \\
  ${serverUrl} \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify({
    operationName: name?.value,
    query: graphqlQueryCompress(query),
  })}'`;
  },
} as Snippet;
