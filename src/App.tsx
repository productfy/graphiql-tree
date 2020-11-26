import classnames from 'classnames';
import {
  ArgumentNode,
  GraphQLArgument,
  GraphQLSchema,
  StringValueNode,
  ValueNode,
  buildClientSchema,
  getIntrospectionQuery,
  isRequiredArgument,
  isScalarType,
  GraphQLInputField,
  ObjectFieldNode,
  isRequiredInputField,
} from 'graphql';
import pickBy from 'lodash/pickBy';
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

  // Returning undefined will fallback to default node handlers
  const customizeNode = ({
    argument,
    argumentNode,
    inputField,
    objectFieldNode,
    onEdit,
  }: {
    argument?: GraphQLArgument; // Schema
    argumentNode?: ArgumentNode; // Selection
    depth: number;
    inputField?: GraphQLInputField;
    objectFieldNode?: ObjectFieldNode;
    onEdit: (prevValueNode?: ValueNode, nextValueNode?: ValueNode) => void;
  }) => {
    const { type } = argument || inputField!;
    const unwrappedType = unwrapType(type);
    const productfyEnum = enums.find(({ left }) => left === unwrappedType.name);

    if (isScalarType(unwrappedType) && productfyEnum) {
      const isRequired =
        (argument && isRequiredArgument(argument)) ||
        (inputField && isRequiredInputField(inputField));
      const onEditInput = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const nextValueNode = {
          kind: 'StringValue',
          value: e.target.value,
        } as StringValueNode;
        onEdit(value, nextValueNode);
      };
      const options = productfyEnum.right;
      const { value } = argumentNode || objectFieldNode!;

      return (
        <div className={classnames('cm-string', styles.select)}>
          <select onChange={onEditInput} value={(value as StringValueNode).value || ''}>
            <option value="" disabled={isRequired} hidden={isRequired}></option>
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
