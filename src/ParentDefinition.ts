import {
  GraphQLArgument,
  GraphQLField,
  GraphQLInputField,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLOutputType,
} from 'graphql';

export default interface ParentDefinition {
  parentDefinition?: ParentDefinition;
  definition:
    | GraphQLArgument
    | GraphQLInputField
    | GraphQLField<any, any>
    | GraphQLNamedType
    | GraphQLObjectType<any, any>
    | GraphQLOutputType;
}
