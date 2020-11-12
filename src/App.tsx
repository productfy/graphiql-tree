import { buildClientSchema, getIntrospectionQuery, GraphQLSchema } from 'graphql';
import React, { useEffect, useRef, useState } from 'react';

import GraphiQLWithExplorer, { FetcherParams } from './GraphiQLWithExplorer';

const url = 'https://stage-user-api.productfy.io/graphql/api/public';

const fetcher = ({ signal }: AbortController) => async (graphQLParams: FetcherParams) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Productfy-TenantDeploymentEnvironmentId': 'Pfy_TnntDeployEnv-DflMainTnnt1',
    },
    body: JSON.stringify(graphQLParams),
    credentials: 'same-origin',
    signal,
  });
  return response.json().catch(() => response.text());
};

const App = () => {
  const abortController = useRef<AbortController>(new AbortController());
  const [schema, setSchema] = useState<GraphQLSchema>();

  useEffect(() => {
    const controller = abortController.current;
    (async () => {
      try {
        const { data } = await fetcher(controller)({
          operationName: 'IntrospectionQuery',
          query: getIntrospectionQuery(),
        });
        setSchema(buildClientSchema(data));
      } catch (error) {
        // Probably should render error in output panel
        console.warn(error);
      }
    })();
    return () => controller.abort();
  }, []);

  return <GraphiQLWithExplorer fetcher={fetcher(abortController.current)} schema={schema} />;
};

export default App;
