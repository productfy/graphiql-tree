import { FC } from 'react';
import type { Provider } from 'react';

export type ProviderInput = Provider<any> | [Provider<any>, any];

export interface ComposeProvidersProps {
  providers: ProviderInput[];
}

const ComposeProviders: FC<ComposeProvidersProps> = ({ providers, children }) => (
  <>
    {providers.reverse().reduce((acc, curr) => {
      const [P, value] = Array.isArray(curr) ? [curr[0], curr[1]] : [curr, undefined];
      return <P value={value}>{acc}</P>;
    }, children)}
  </>
);

export default ComposeProviders;
