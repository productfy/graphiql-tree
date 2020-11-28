import {
  GraphQLArgument,
  GraphQLField,
  GraphQLInputField,
  GraphQLObjectType,
  GraphQLOutputType,
} from 'graphql';

export default interface ParentDefinition {
  parentDefinition?: ParentDefinition;
  definition:
    | GraphQLArgument
    | GraphQLInputField
    | GraphQLField
    | GraphQLObjectType
    | GraphQLOutputType;
}
