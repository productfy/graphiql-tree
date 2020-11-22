import classnames from 'classnames';
import {
  ArgumentNode,
  GraphQLArgument,
  GraphQLSchema,
  buildClientSchema,
  getIntrospectionQuery,
  isNonNullType,
  isScalarType,
} from 'graphql';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';

import GraphiQLWithTree, { FetcherParams } from './GraphiQLWithTree';
import { unwrapType } from './graphqlHelper';

import styles from './GraphiQLTree.module.scss';

const url = 'https://stage-user-api.productfy.io/graphql/api/public';

const GET_ENUMS = '{ enums { left right { code description name }}}';

interface ProductfyEnum {
  left: string;
  right: {
    code: string;
    description?: string;
    name: string;
  }[];
}

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
  const [enums, setEnums] = useState<ProductfyEnum[]>([]);
  const [schema, setSchema] = useState<GraphQLSchema>();

  useEffect(() => {
    const controller = abortController.current;
    (async () => {
      try {
        const schemaResult = await fetcher(controller)({
          operationName: 'IntrospectionQuery',
          query: getIntrospectionQuery(),
        });
        const enumResult = await fetcher(controller)({
          operationName: 'getEnums',
          query: GET_ENUMS,
        });
        setSchema(buildClientSchema(schemaResult.data));
        setEnums(enumResult.data.enums);
      } catch (error) {
        // Probably should render error in output panel
        console.warn(error);
      }
    })();
    return () => controller.abort();
  }, []);

  // Returning undefined will fallback to default node handlers
  const customizeNode = ({
    arg,
    onEditArgument,
  }: {
    arg: GraphQLArgument; // Schema
    argumentNode: ArgumentNode; // Selection
    depth: number;
    onEditArgument: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  }) => {
    const { type } = arg;
    const unwrappedType = unwrapType(type);
    const productfyEnum = enums.find(({ left }) => left === unwrappedType.name);
    if (isScalarType(unwrappedType) && productfyEnum) {
      const isRequired = isNonNullType(type);
      const options = productfyEnum.right;
      return (
        <div className={classnames('cm-string', styles.select)}>
          <select onChange={onEditArgument}>
            <option value="" disabled={isRequired} selected hidden={isRequired}></option>
            {options.map(({ code, description }) => (
              <option key={code} value={code}>
                {code} - {description}
              </option>
            ))}
          </select>
        </div>
      );
    }
  };

  return (
    <GraphiQLWithTree
      customizeNode={customizeNode}
      fetcher={fetcher(abortController.current)}
      schema={schema}
    />
  );
};

export default App;
