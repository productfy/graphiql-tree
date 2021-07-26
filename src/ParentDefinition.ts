import {
  GraphQLArgument,
  GraphQLField,
  GraphQLInputField,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLOutputType,
} from 'graphql';

export default interface Parent {
  parent?: Parent;
  definition:
    | GraphQLArgument
    | GraphQLInputField
    | GraphQLField<any, any>
    | GraphQLNamedType
    | GraphQLObjectType<any, any>
    | GraphQLOutputType;
}
