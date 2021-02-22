import { OperationDefinitionNode } from 'graphql';

export interface GenerateParams {
  context?: any;
  operationDefinition: OperationDefinitionNode;
  serverUrl: string;
  variables?: string;
}

export default interface Snippet {
  generate: (p: GenerateParams) => string;
  mode: string;
  name: string; // Must be unique across all Snippets, and cannot be 'GraphQL'
}
