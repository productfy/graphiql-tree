/**
 * Helpers to modify parsed GraphQL
 */
import {
  ArgumentNode,
  ASTNode,
  DocumentNode,
  FieldNode,
  FragmentSpreadNode,
  GraphQLArgument,
  GraphQLField,
  GraphQLInputField,
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
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isObjectType,
  isRequiredArgument,
  isRequiredInputField,
  isWrappingType,
  print,
} from 'graphql';
import unionBy from 'lodash/unionBy';
import parserGraphql from 'prettier/parser-graphql';
import prettier from 'prettier/standalone';

const defaultTypeName: FieldNode = {
  kind: 'Field',
  name: {
    kind: 'Name',
    value: '__typename',
  },
};

export function generateArgumentSelectionFromType(arg: GraphQLArgument): ArgumentNode {
  const { name, type } = arg;
  const unwrappedType = unwrapType(type);

  let value: ValueNode = getDefaultValueByType(unwrappedType);

  if (isInputObjectType(unwrappedType)) {
    const fields = unwrappedType.getFields();
    value = {
      kind: 'ObjectValue',
      fields: Object.values(fields)
        .filter(field => isRequiredInputField(field))
        .map(field => ({
          kind: 'ObjectField',
          name: {
            kind: 'Name',
            value: field.name,
          },
          value: getDefaultValueByType(unwrapType(field.type)),
        })),
    } as ObjectValueNode;
  }

  return {
    kind: 'Argument',
    name: {
      kind: 'Name',
      value: name,
    },
    value: isListType(type)
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

export function generateObjectFieldNodeFromInputField(field: GraphQLInputField): ObjectFieldNode {
  const { name, type } = field;
  const unwrappedType = unwrapType(type);

  let value: ValueNode = getDefaultValueByType(unwrappedType);

  if (isInputObjectType(unwrappedType)) {
    value = {
      kind: 'ObjectValue',
      fields: Object.values(unwrappedType.getFields())
        .filter(f => isRequiredInputField(f))
        .map(f => ({
          kind: 'ObjectField',
          name: {
            kind: 'Name',
            value: f.name,
          },
          value: getDefaultValueByType(unwrapType(f.type)),
        })),
    };
  }

  return {
    kind: 'ObjectField',
    name: {
      kind: 'Name',
      value: name,
    },
    value: isListType(type)
      ? {
          kind: 'ListValue',
          values: [value],
        }
      : value,
  };
}

export function generateDefaultQueryByQueryOrMutationName({
  name,
  operationType = 'query',
  schema,
}: {
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
            selections: [generateOutputFieldSelectionFromType(field)],
          } as SelectionSetNode,
        } as OperationDefinitionNode,
      ],
    };
    return transformDocumentNodeToQueryString(doc);
  }

  return '';
}

export function generateOutputFieldSelectionFromType(field: GraphQLField<any, any>): SelectionNode {
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
      .filter(arg => isRequiredArgument(arg))
      .map(arg => generateArgumentSelectionFromType(arg)),
    selectionSet,
  } as FieldNode;
}

export function getDefaultValueByType(type: GraphQLNamedType): ValueNode {
  if (isInputObjectType(type)) {
    return {
      kind: 'ObjectValue',
      fields: Object.values(type.getFields())
        .filter(field => isRequiredInputField(field))
        .map(
          field =>
            ({
              kind: 'ObjectField',
              name: {
                kind: 'Name',
                value: field.name,
              },
              value: getDefaultValueByType(unwrapType(field.type)),
            } as ObjectFieldNode),
        ),
    };
  }
  if (isEnumType(type)) {
    return {
      kind: 'NullValue',
    };
  }
  if (type.name === 'Boolean') {
    return {
      kind: 'BooleanValue',
      value: true,
    };
  }
  if (type.name === 'BigDecimal' || type.name === 'Float') {
    return {
      kind: 'FloatValue',
      value: '0',
    };
  }
  if (type.name === 'Int') {
    return {
      kind: 'IntValue',
      value: '0',
    };
  }
  return {
    kind: 'StringValue',
    value: '',
  };
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
): ArgumentNode {
  const sorter = (a: ObjectFieldNode, b: ObjectFieldNode) =>
    a.name.value.localeCompare(b.name.value);

  // No-op
  if (prevObjectFieldNode === nextObjectFieldNode) {
    return argumentNode;
  }
  // Remove
  if (prevObjectFieldNode && !nextObjectFieldNode) {
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
                kind: 'ObjectValue',
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
  if (!selectionSetNode) {
    debugger;
  }
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
    selections: unionBy([nextSelectionNode!], selectionSetNode.selections, 'name.value').sort(
      sorter,
    ),
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
