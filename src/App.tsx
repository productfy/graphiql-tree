import { ChangeEvent, useEffect, useRef, useState } from 'react';
import type {
  DefaultValueCustomizer,
  DescriptionCustomizer,
  NodeCustomizerParams,
} from './CustomizerTypes';
import {
  GraphQLSchema,
  StringValueNode,
  buildClientSchema,
  getIntrospectionQuery,
  isObjectType,
  isScalarType,
} from 'graphql';

import Curl from './snippets/Curl';
import type { FetcherParams } from '@graphiql/toolkit';
import GraphiQLWithTree from './GraphiQLWithTree';
import HttpJson from './snippets/HttpJson';
import classnames from 'classnames';
import find from 'lodash/find';
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

const serverUrl = 'https://user-api.productfy.io/graphql/api/public';

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

type DescriptionOverrides = {
  type: string;
  field: string;
  description: string;
};

const App = () => {
  const abortController = useRef<AbortController>(new AbortController());
  const [enums, setEnums] = useState<ProductfyEnum[]>([]);
  const [schema, setSchema] = useState<GraphQLSchema>();
  const [descriptionOverrides, setDescriptionOverrides] = useState<DescriptionOverrides[]>([]);

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

  const customizeDefaultValue: DefaultValueCustomizer = (_arg, _parent) => {
    return undefined;
  };

  const customizeDescription: DescriptionCustomizer = (_field, _parent) => {
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

  return schema ? (
    <GraphiQLWithTree
      {...{
        customizeDefaultValue,
        customizeDescription,
        customizeNode,
        fetcher: fetcher(abortController.current),
        schema,
        serverUrl,
        snippets: [Curl, HttpJson],
      }}
    />
  ) : null;
};

export default App;
