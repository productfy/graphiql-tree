import {
  GraphQLSchema,
  StringValueNode,
  buildClientSchema,
  getIntrospectionQuery,
  isScalarType,
} from 'graphql';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';

import Curl from './snippets/Curl';
import DefaultValueCustomizer from './DefaultValueCustomizer';
import { FetcherParams } from 'graphiql/dist/components/GraphiQL';
import GraphiQLWithTree from './GraphiQLWithTree';
import { NodeCustomizerParams } from './NodeCustomizer';
import classnames from 'classnames';
import pickBy from 'lodash/pickBy';
import styles from './GraphiQLTree.module.scss';
import { unwrapType } from './graphqlHelper';

interface ProductfyEnum {
  left: string;
  right: {
    code: string;
    description?: string;
    name: string;
  }[];
}

const serverUrl = 'https://stage-user-api.productfy.io/graphql/api/public';

const fetcher = ({ signal }: AbortController) => async (graphQLParams: FetcherParams) => {
  const response = await fetch(serverUrl, {
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

const GET_ENUMS = '{ enums { left right { code description name }}}';

const mutationWhitelist = [
  'activatePaymentCard',
  'applyFinancialAccountGroupFinancialTransactions',
  'applySingleBalanceFinancialTransaction',
  'cancelAchTransferRequest',
  'closeFinancialAccount',
  'createAchTransferRequest',
  'createManuallyEnteredExternalFinancialAccountWithOwnerIds',
  'createPhysicalCommercialCreditCardProduct',
  'createPhysicalCommercialDebitCardProduct',
  'createPhysicalCommercialPrepaidCardProduct',
  'createVirtualCommercialCreditCardProduct',
  'createVirtualCommercialDebitCardProduct',
  'createVirtualCommercialPrepaidCardProduct',
  'createVirtualGenericFinancialAccount',
  'deactivatePaymentCard',
  'downloadPersonProfessionalData',
  'financialAccountKvpData',
  'initiateMicroDeposits',
  'invalidateLoginSession',
  'issueCommercialCreditCard',
  'issueCommercialDebitCard',
  'issueCommercialPrepaidCard',
  'kbaAnswers',
  'loginKvpData',
  'logIn',
  'organizationAddress',
  'organizationKvpData',
  'personAddress',
  'personEmailAddress',
  'personKvpData',
  'personPhoneNumber',
  'removeFinancialAccount',
  'requestEquifaxConsumerCreditData',
  'resetPassword',
  'reverseFinancialTransaction',
  'saveCompany',
  'saveOrganizationPersonAssociation',
  'settlePendingFinancialTransaction',
  'signUp',
  'updateLoginAccountStatus',
  'updatePerson',
  'updateCardSpendingLimits',
  'verifyMicroDeposits',
];

const queryWhitelist = [
  'achTransferRequests',
  'decrypt',
  'documents',
  'enums',
  'financialAccount',
  'financialAccounts',
  'financialProducts',
  'financialStatementCycles',
  'financialTransactions',
  'finsightProfile',
  'kbaQuestionnaire',
  'latestFinancialStatementCycle',
  'loginKvpDataSet',
  'organization',
  'organizationKvpDataSet',
  'personKvpDataSet',
  'tenantOperatingAccounts',
  'whoAmI',
];

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
        const schema: GraphQLSchema = buildClientSchema(schemaResult.data);
        // @ts-expect-error
        schema._mutationType._fields = pickBy(schema._mutationType._fields, (_value, key) =>
          mutationWhitelist.includes(key),
        );
        // @ts-expect-error
        schema._queryType._fields = pickBy(schema._queryType._fields, (_value, key) =>
          queryWhitelist.includes(key),
        );
        setSchema(schema);
        setEnums(enumResult.data.enums);
      } catch (error) {
        // Probably should render error in output panel
        console.warn(error);
      }
    })();
    return () => controller.abort();
  }, []);

  const customizeDefaultValue: DefaultValueCustomizer = (_arg, _parentDefinition) => {
    return undefined;
  };

  // Returning undefined will fallback to default node handlers
  const customizeNode = ({
    isRequired = false,
    name,
    onEdit,
    type,
    value,
  }: NodeCustomizerParams) => {
    const unwrappedType = unwrapType(type);
    const productfyEnum = enums.find(({ left }) => left === unwrappedType.name);

    if (isScalarType(unwrappedType) && productfyEnum) {
      const onEditInput = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const nextValueNode = {
          kind: 'StringValue',
          value: e.target.value,
        } as StringValueNode;
        onEdit(value, nextValueNode);
      };
      const options = productfyEnum.right.sort((a, b) => a.code.localeCompare(b.code));

      return (
        <div className={classnames('cm-string', styles.select)}>
          <select name={name} onChange={onEditInput} value={(value as StringValueNode).value || ''}>
            <option value="" disabled={isRequired} hidden={isRequired}></option>
            {options
              .sort((a, b) => (a.description || '').localeCompare(b.description || ''))
              .map(({ code, description }) => (
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
      customizeDefaultValue={customizeDefaultValue}
      customizeNode={customizeNode}
      fetcher={fetcher(abortController.current)}
      schema={schema}
      serverUrl={serverUrl}
      snippets={[Curl]}
    />
  );
};

export default App;
