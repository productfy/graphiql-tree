import 'codemirror/mode/shell/shell';

import first from 'lodash/first';
import graphqlQueryCompress from 'graphql-query-compress';

export default {
  language: 'cURL',
  codeMirrorMode: 'shell',
  name: 'cURL',
  options: [],
  generate: ({ context, operationDataList, serverUrl }: any) => {
    const { variables = '' } = context || {};
    const op = first(operationDataList);
    const { name, query }: any = op;
    return `curl -X POST \\
  ${serverUrl} \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify({
    operationName: name,
    query: graphqlQueryCompress(query),
    ...(variables.length > 0 ? { variables } : {}),
  })}'`;
  },
};
