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
    | GraphQLField<any, any>
    | GraphQLObjectType<any, any>
    | GraphQLOutputType;
}
