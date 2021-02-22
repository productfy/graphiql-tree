/**
 * Helpers to modify parsed GraphQL
 */
import {
  ASTNode,
  ArgumentNode,
  DocumentNode,
  FieldNode,
  FragmentSpreadNode,
  GraphQLArgument,
  GraphQLField,
  GraphQLInputField,
  GraphQLInputType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLSchema,
  GraphQLType,
  InlineFragmentNode,
  ListValueNode,
  ObjectFieldNode,
  ObjectValueNode,
  OperationDefinitionNode,
  OperationTypeNode,
  SelectionNode,
  SelectionSetNode,
  ValueNode,
  astFromValue,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isRequiredArgument,
  isRequiredInputField,
  isWrappingType,
  print,
  VariableDefinitionNode,
} from 'graphql';

import DefaultValueCustomizer from './DefaultValueCustomizer';
import ParentDefinition from './ParentDefinition';
import parserGraphql from 'prettier/parser-graphql';
import prettier from 'prettier/standalone';
import unionBy from 'lodash/unionBy';

const defaultTypeName: FieldNode = {
  kind: 'Field',
  name: {
    kind: 'Name',
    value: '__typename',
  },
};

export function generateArgumentSelectionFromType(
  arg: GraphQLArgument,
  parentDefinition: ParentDefinition,
  customizeDefaultValue: DefaultValueCustomizer,
): ArgumentNode {
  const { name, type } = arg;
  const unwrappedType = unwrapType(type);

  let value: ValueNode =
    customizeDefaultValue(arg, parentDefinition) ||
    getDefaultValueByType(type, parentDefinition, customizeDefaultValue);

  if (isInputObjectType(unwrappedType)) {
    const fields = unwrappedType.getFields();
    value = {
      kind: 'ObjectValue',
      fields: Object.values(fields)
        .filter(
          field =>
            isRequiredInputField(field) ||
            customizeDefaultValue(field, { definition: arg, parentDefinition }),
        )
        .map(field => ({
          kind: 'ObjectField',
          name: {
            kind: 'Name',
            value: field.name,
          },
          value:
            customizeDefaultValue(field, { definition: arg, parentDefinition }) ||
            getDefaultValueByType(
              field.type,
              { definition: arg, parentDefinition },
              customizeDefaultValue,
            ),
        })),
    } as ObjectValueNode;
  }

  return {
    kind: 'Argument',
    name: {
      kind: 'Name',
      value: name,
    },
    value: hasList(type)
      ? {
          kind: 'ListValue',
          values: [value],
        }
      : value,
  };
}

export function generateInlineFragmentFromType(type: GraphQLNamedType): InlineFragmentNode {
  return {
    kind: 'InlineFragment',
    typeCondition: {
      kind: 'NamedType',
      name: { kind: 'Name', value: type.name },
    },
    selectionSet: {
      kind: 'SelectionSet',
      selections: [defaultTypeName],
    },
  };
}

export function generateObjectFieldNodeFromInputField(
  field: GraphQLInputField,
  parentDefinition: ParentDefinition,
  customizeDefaultValue: DefaultValueCustomizer,
): ObjectFieldNode {
  const { name, type } = field;
  const unwrappedType = unwrapType(type);

  let value: ValueNode =
    customizeDefaultValue(field, parentDefinition) ||
    getDefaultValueByType(type, parentDefinition, customizeDefaultValue);

  if (isInputObjectType(unwrappedType)) {
    value = {
      kind: 'ObjectValue',
      fields: Object.values(unwrappedType.getFields())
        .filter(
          f =>
            isRequiredInputField(f) ||
            customizeDefaultValue(f, { definition: field, parentDefinition }),
        )
        .map(f => ({
          kind: 'ObjectField',
          name: {
            kind: 'Name',
            value: f.name,
          },
          value:
            customizeDefaultValue(f, { definition: field, parentDefinition }) ||
            getDefaultValueByType(
              f.type,
              { definition: field, parentDefinition },
              customizeDefaultValue,
            ),
        })),
    };
  }

  return {
    kind: 'ObjectField',
    name: {
      kind: 'Name',
      value: name,
    },
    value: hasList(type)
      ? {
          kind: 'ListValue',
          values: [value],
        }
      : value,
  };
}

export function generateDefaultQueryByQueryOrMutationName({
  customizeDefaultValue = () => undefined,
  name,
  operationType = 'query',
  schema,
}: {
  customizeDefaultValue?: DefaultValueCustomizer;
  name: string;
  operationType?: OperationTypeNode;
  schema: GraphQLSchema;
}): string {
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const field: GraphQLField<any, any> | undefined =
    operationType === 'query' ? queryType?.getFields()[name] : mutationType?.getFields()[name];
  if (field) {
    const doc: DocumentNode = {
      kind: 'Document',
      definitions: [
        {
          kind: 'OperationDefinition',
          operation: operationType,
          name: {
            kind: 'Name',
            value: name,
          },
          selectionSet: {
            kind: 'SelectionSet',
            selections: [
              generateOutputFieldSelectionFromType(
                field,
                { definition: field },
                customizeDefaultValue,
              ),
            ],
          } as SelectionSetNode,
        } as OperationDefinitionNode,
      ],
    };
    return transformDocumentNodeToQueryString(doc);
  }

  return '';
}

export function generateOutputFieldSelectionFromType(
  field: GraphQLField<any, any>,
  parentDefinition: ParentDefinition,
  customizeDefaultValue: DefaultValueCustomizer,
): SelectionNode {
  const { args = [], name, type } = field;
  const unwrappedType = unwrapType(type);
  let selectionSet: SelectionSetNode | undefined = undefined;

  if (isObjectType(unwrappedType) || isInterfaceType(unwrappedType)) {
    selectionSet = {
      kind: 'SelectionSet',
      selections: [defaultTypeName],
    };
  }

  return {
    kind: 'Field',
    name: {
      kind: 'Name',
      value: name,
    },
    arguments: args
      .filter(
        arg =>
          isRequiredArgument(arg) ||
          customizeDefaultValue(arg, { definition: field, parentDefinition }),
      )
      .sort((a, b) => (a.name === 'id' ? -1 : b.name === 'id' ? 1 : a.name.localeCompare(b.name)))
      .map(arg =>
        generateArgumentSelectionFromType(
          arg,
          { definition: field, parentDefinition },
          customizeDefaultValue,
        ),
      ),
    selectionSet,
  } as FieldNode;
}

export function getDefaultValueByType(
  type: GraphQLInputType,
  parentDefinition: ParentDefinition,
  customizeDefaultValue: DefaultValueCustomizer,
): ValueNode {
  if (isNonNullType(type)) {
    return getDefaultValueByType(type.ofType, parentDefinition, customizeDefaultValue);
  }
  if (isListType(type)) {
    return {
      kind: 'ListValue',
      values: [getDefaultValueByType(type.ofType, parentDefinition, customizeDefaultValue)],
    };
  }
  if (isInputObjectType(type)) {
    const cdv = (field: GraphQLInputField) =>
      customizeDefaultValue(field, { definition: type, parentDefinition });
    return {
      kind: 'ObjectValue',
      fields: Object.values(type.getFields())
        .filter(field => isRequiredInputField(field) || cdv(field))
        .map(
          field =>
            ({
              kind: 'ObjectField',
              name: {
                kind: 'Name',
                value: field.name,
              },
              value:
                cdv(field) ??
                getDefaultValueByType(
                  field.type,
                  { definition: type, parentDefinition },
                  customizeDefaultValue,
                ),
            } as ObjectFieldNode),
        ),
    };
  }
  // TODO: customizeDefaultValue for GraphQLEnumType and GraphQLScalarType
  if (isEnumType(type)) {
    return astFromValue(null, type)!;
  }
  /* Everything hereafter are scalars */
  if (type.name === 'Boolean') {
    return astFromValue(true, type)!;
  }
  if (['BigDecimal', 'Float', 'Int', 'Long'].includes(type.name)) {
    return astFromValue(0, type)!;
  }
  return astFromValue('', type)!;
}

export function getTypeName(type?: GraphQLType): string {
  if (!type) {
    return '';
  }
  if (type instanceof GraphQLNonNull) {
    return `${getTypeName(type.ofType)}!`;
  }
  if (type instanceof GraphQLList) {
    return `[${getTypeName(type.ofType)}]`;
  }
  return type.name;
}

export function hasList(type: GraphQLType): boolean {
  let unwrappedType = type;
  while (isWrappingType(unwrappedType)) {
    if (isListType(unwrappedType)) {
      return true;
    }
    unwrappedType = (unwrappedType as GraphQLNonNull<any>).ofType;
  }
  return false;
}

export function mergeArgumentIntoField(
  fieldNode: FieldNode,
  prevArgumentNode?: ArgumentNode,
  nextArgumentNode?: ArgumentNode,
): FieldNode {
  const sorter = (a: ArgumentNode, b: ArgumentNode) => a.name.value.localeCompare(b.name.value);

  // No-op
  if (prevArgumentNode === nextArgumentNode) {
    return fieldNode;
  }
  // Remove
  if (prevArgumentNode && !nextArgumentNode) {
    return {
      ...fieldNode,
      arguments: fieldNode.arguments
        ?.filter(arg => arg.name.value !== prevArgumentNode.name.value)
        .sort(sorter),
    };
  }
  // Add
  if (!prevArgumentNode && nextArgumentNode) {
    return {
      ...fieldNode,
      arguments: [...(fieldNode.arguments || []), nextArgumentNode!].sort(sorter),
    };
  }
  // Update
  return {
    ...fieldNode,
    arguments: unionBy([nextArgumentNode!], fieldNode.arguments, 'name.value').sort(sorter),
  };
}

export function mergeFieldIntoInlineFragment(
  inlineFragmentNode: InlineFragmentNode,
  prevFieldNode?: FieldNode,
  nextFieldNode?: FieldNode,
): InlineFragmentNode {
  return {
    ...inlineFragmentNode,
    selectionSet: mergeSelectionIntoSelectionSet(
      inlineFragmentNode.selectionSet,
      prevFieldNode,
      nextFieldNode,
    ),
  };
}

export function mergeObjectFieldIntoArgument(
  argumentNode: ArgumentNode,
  prevObjectFieldNode?: ObjectFieldNode,
  nextObjectFieldNode?: ObjectFieldNode,
  index?: number,
): ArgumentNode {
  const isList = Number.isInteger(index);
  const sorter = (a: ObjectFieldNode, b: ObjectFieldNode) =>
    a.name.value.localeCompare(b.name.value);

  // No-op
  if (prevObjectFieldNode === nextObjectFieldNode) {
    return argumentNode;
  }
  // Remove
  if (prevObjectFieldNode && !nextObjectFieldNode) {
    if (isList) {
      return {
        ...argumentNode,
        value: {
          ...argumentNode.value,
          values: ((argumentNode.value as ListValueNode).values || []).map((v, i) =>
            i === index
              ? {
                  ...v,
                  fields: (v as ObjectValueNode).fields.filter(
                    f => f.name.value !== prevObjectFieldNode.name.value,
                  ),
                }
              : v,
          ),
        } as ListValueNode,
      };
    }
    return {
      ...argumentNode,
      value: {
        ...argumentNode.value,
        fields: (argumentNode.value as ObjectValueNode).fields
          .filter(field => field.name.value !== prevObjectFieldNode.name.value)
          .sort(sorter),
      } as ObjectValueNode,
    };
  }
  // Add
  if (!prevObjectFieldNode && nextObjectFieldNode) {
    if (isList) {
      return {
        ...argumentNode,
        value: {
          ...argumentNode.value,
          values: ((argumentNode.value as ListValueNode).values || []).map((v, i) =>
            i === index
              ? {
                  kind: 'ObjectValue',
                  fields: [...(v as ObjectValueNode).fields, nextObjectFieldNode].sort(sorter),
                }
              : v,
          ),
        } as ListValueNode,
      };
    }
    return {
      ...argumentNode,
      value: {
        ...argumentNode.value,
        fields: [...(argumentNode.value as ObjectValueNode).fields, nextObjectFieldNode].sort(
          sorter,
        ),
      } as ObjectValueNode,
    };
  }
  // Update
  if (isList) {
    return {
      ...argumentNode,
      value: {
        ...argumentNode.value,
        values: ((argumentNode.value as ListValueNode).values || []).map((v, i) =>
          i === index
            ? {
                ...v,
                fields: unionBy<ObjectFieldNode>(
                  [nextObjectFieldNode!],
                  (v as ObjectValueNode).fields,
                  'name.value',
                ).sort(sorter),
              }
            : v,
        ),
      } as ListValueNode,
    };
  }
  return {
    ...argumentNode,
    value: {
      ...argumentNode.value,
      fields: unionBy(
        [nextObjectFieldNode!],
        (argumentNode.value as ObjectValueNode).fields,
        'name.value',
      ).sort(sorter),
    } as ObjectValueNode,
  };
}

export function mergeObjectFieldIntoObjectField(
  parentObjectFieldNode: ObjectFieldNode,
  prevObjectFieldNode?: ObjectFieldNode,
  nextObjectFieldNode?: ObjectFieldNode,
  index?: number,
): ObjectFieldNode {
  const isList = Number.isInteger(index);
  const sorter = (a: ObjectFieldNode, b: ObjectFieldNode) =>
    a.name.value.localeCompare(b.name.value);

  // No-op
  if (prevObjectFieldNode === nextObjectFieldNode) {
    return parentObjectFieldNode;
  }

  // Remove
  if (prevObjectFieldNode && !nextObjectFieldNode) {
    if (isList) {
      return {
        ...parentObjectFieldNode,
        value: {
          ...parentObjectFieldNode.value,
          values: ((parentObjectFieldNode.value as ListValueNode).values || []).map((v, i) =>
            i === index
              ? {
                  ...v,
                  fields: (v as ObjectValueNode).fields.filter(
                    f => f.name.value !== prevObjectFieldNode.name.value,
                  ),
                }
              : v,
          ),
        } as ListValueNode,
      };
    }
    return {
      ...parentObjectFieldNode,
      value: {
        kind: 'ObjectValue',
        fields: (parentObjectFieldNode.value as ObjectValueNode).fields
          .filter(field => field.name.value !== prevObjectFieldNode.name.value)
          .sort(sorter),
      },
    };
  }
  // Add
  if (!prevObjectFieldNode && nextObjectFieldNode) {
    if (isList) {
      return {
        ...parentObjectFieldNode,
        value: {
          ...parentObjectFieldNode.value,
          values: ((parentObjectFieldNode.value as ListValueNode).values || []).map((v, i) =>
            i === index
              ? {
                  kind: 'ObjectValue',
                  fields: [...(v as ObjectValueNode).fields, nextObjectFieldNode].sort(sorter),
                }
              : v,
          ),
        } as ListValueNode,
      };
    }
    return {
      ...parentObjectFieldNode,
      value: {
        kind: 'ObjectValue',
        fields: [
          ...(parentObjectFieldNode.value as ObjectValueNode).fields,
          nextObjectFieldNode,
        ].sort(sorter),
      },
    };
  }
  // Update
  if (isList) {
    return {
      ...parentObjectFieldNode,
      value: {
        ...parentObjectFieldNode.value,
        values: ((parentObjectFieldNode.value as ListValueNode).values || []).map((v, i) =>
          i === index
            ? {
                ...v,
                fields: unionBy<ObjectFieldNode>(
                  [nextObjectFieldNode!],
                  (v as ObjectValueNode).fields,
                  'name.value',
                ).sort(sorter),
              }
            : v,
        ),
      } as ListValueNode,
    };
  }
  return {
    ...parentObjectFieldNode,
    value: {
      kind: 'ObjectValue',
      fields: unionBy(
        [nextObjectFieldNode!],
        (parentObjectFieldNode.value as ObjectValueNode).fields,
        'name.value',
      ).sort(sorter),
    },
  };
}

export function mergeOperationDefinitionIntoDocument(
  documentNode: DocumentNode,
  prevOperationDefinitionNode: OperationDefinitionNode,
  nextOperationDefinitionNode: OperationDefinitionNode,
): DocumentNode {
  return {
    ...documentNode,
    definitions: documentNode.definitions.map(doc =>
      doc === prevOperationDefinitionNode ? nextOperationDefinitionNode : doc,
    ),
  };
}

export function mergeSelectionIntoSelectionSet(
  selectionSetNode: SelectionSetNode,
  prevSelectionNode?: SelectionNode,
  nextSelectionNode?: SelectionNode,
): SelectionSetNode {
  const sorter = (a: SelectionNode, b: SelectionNode) => {
    if (a.kind === 'Field' && b.kind === 'Field') {
      return a.name.value.localeCompare(b.name.value);
    } else if (a.kind === 'Field' && b.kind === 'InlineFragment') {
      return -1;
    } else if (a.kind === 'InlineFragment' && b.kind === 'Field') {
      return 1;
    } else if (a.kind === 'InlineFragment' && b.kind === 'InlineFragment') {
      return (a.typeCondition?.name.value || '').localeCompare(b.typeCondition?.name.value || '');
    }
    return 0;
  };

  // No-op
  if (prevSelectionNode === nextSelectionNode) {
    return selectionSetNode;
  }
  // Remove
  if (prevSelectionNode && !nextSelectionNode) {
    return {
      ...selectionSetNode,
      selections: selectionSetNode.selections
        ?.filter(sel => {
          if (prevSelectionNode.kind === 'Field') {
            return (sel as FieldNode)?.name?.value !== prevSelectionNode.name.value;
          } else if (prevSelectionNode.kind === 'InlineFragment') {
            return (
              (sel as InlineFragmentNode)?.typeCondition?.name?.value !==
              prevSelectionNode.typeCondition?.name?.value
            );
          }
          return true;
        })
        .sort(sorter),
    };
  }
  // Add
  if (!prevSelectionNode && nextSelectionNode) {
    return {
      ...selectionSetNode,
      selections: [...(selectionSetNode.selections || []), nextSelectionNode].sort(sorter),
    };
  }
  // Update
  return {
    ...selectionSetNode,
    selections: unionBy([nextSelectionNode!], selectionSetNode.selections, s =>
      s.kind === 'InlineFragment'
        ? (s as InlineFragmentNode).typeCondition?.name.value
        : s.name.value,
    ).sort(sorter),
  };
}

export function mergeSelectionSetIntoSelection(
  selectionNode: SelectionNode,
  _prevSelectionSet?: SelectionSetNode,
  nextSelectionSet?: SelectionSetNode,
): SelectionNode {
  if (selectionNode.kind === 'Field') {
    return {
      ...selectionNode,
      selectionSet: nextSelectionSet,
    } as FieldNode;
  } else if (selectionNode.kind === 'FragmentSpread') {
    return selectionNode as FragmentSpreadNode;
  }
  return {
    ...selectionNode,
    selectionSet: nextSelectionSet,
  } as InlineFragmentNode;
}

export function mergeSelectionSetIntoOperationDefinition(
  operationDefinitionNode: OperationDefinitionNode,
  _prevSelectionSet?: SelectionSetNode,
  nextSelectionSet?: SelectionSetNode,
): OperationDefinitionNode {
  return {
    ...operationDefinitionNode,
    selectionSet:
      nextSelectionSet ||
      ({
        kind: 'SelectionSet',
        selections: [],
      } as SelectionSetNode),
  };
}

export function sourcesAreEqual<T extends { [P in K]?: ASTNode }, K extends keyof T>(key: K) {
  return (prev: T, next: T) => {
    const prevNode: ASTNode | undefined = prev[key];
    const prevString = prevNode?.loc?.source.body.slice(prevNode.loc?.start, prevNode.loc?.end);
    const nextNode: ASTNode | undefined = next[key];
    const nextString = nextNode?.loc?.source.body.slice(nextNode.loc?.start, nextNode.loc?.end);
    const isEqual = prevString?.length === nextString?.length && prevString === nextString;
    return isEqual;
  };
}

export function transformDocumentNodeToQueryString(doc: DocumentNode): string {
  return prettier.format(print(doc), { parser: 'graphql', plugins: [parserGraphql] });
}

export function unwrapType(type: GraphQLType): GraphQLNamedType {
  let unwrappedType = type;
  while (isWrappingType(unwrappedType)) {
    unwrappedType = unwrappedType.ofType;
  }
  return unwrappedType;
}

export function updateOperationDefinition(
  operationDefinition: OperationDefinitionNode,
  {
    name,
    operation,
  }: {
    name: string;
    operation: OperationTypeNode;
  },
): OperationDefinitionNode {
  return {
    ...operationDefinition,
    name: {
      kind: 'Name',
      value: name,
    },
    operation,
  };
}

export function updateOperationVariable(
  operationDefinition: OperationDefinitionNode,
  prevVariableDefinition?: VariableDefinitionNode,
  nextVariableDefinition?: VariableDefinitionNode,
): OperationDefinitionNode {
  if (nextVariableDefinition) {
    return {
      ...operationDefinition,
      variableDefinitions: [
        ...(operationDefinition.variableDefinitions || []),
        nextVariableDefinition,
      ],
    };
  } else {
    return {
      ...operationDefinition,
      variableDefinitions: (operationDefinition.variableDefinitions || []).filter(
        ({ variable }) => variable.name !== prevVariableDefinition?.variable.name,
      ),
    };
  }
}
