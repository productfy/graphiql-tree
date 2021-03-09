import 'codemirror/mode/http/http';

import Snippet from './Snippet';
import graphqlQueryCompress from 'graphql-query-compress';
import { print } from 'graphql';

export default {
  name: 'HTTP',
  mode: 'http',
  generate: ({ context, operationDefinition, serverUrl }) => {
    try {
      const { variables } = context || {};
      const name = operationDefinition.name?.value;
      const query = print(operationDefinition);
      const url = new URL(serverUrl);

      return `POST ${url.pathname} HTTP/1.1
Host: ${url.hostname}
Content-Type: application/json

${JSON.stringify(
  {
    operationName: name,
    query: graphqlQueryCompress(query),
    variables,
  },
  null,
  2,
)}`;
    } catch (e) {
      return '';
    }
  },
} as Snippet;
