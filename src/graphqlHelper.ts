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
  GraphQLType,
  InlineFragmentNode,
  ObjectFieldNode,
  ObjectValueNode,
  OperationDefinitionNode,
  OperationTypeNode,
  SelectionNode,
  SelectionSetNode,
  ValueNode,
  isInputObjectType,
  isInterfaceType,
  isObjectType,
  isRequiredArgument,
  isWrappingType,
  print,
  isScalarType,
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

  let value: ValueNode = {
    kind: 'StringValue',
    value: '',
  };

  if (isScalarType(unwrappedType)) {
    if (unwrappedType.name === 'Boolean') {
      value = {
        kind: 'BooleanValue',
        value: true,
      };
    }
  }

  if (isInputObjectType(unwrappedType)) {
    value = {
      kind: 'ObjectValue',
      fields: [],
    };
  }

  return {
    kind: 'Argument',
    name: {
      kind: 'Name',
      value: name,
    },
    value,
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

  let value: ValueNode = {
    kind: 'StringValue',
    value: '',
  };

  if (isScalarType(unwrappedType)) {
    if (unwrappedType.name === 'Boolean') {
      value = {
        kind: 'BooleanValue',
        value: true,
      };
    }
  }

  if (isInputObjectType(unwrappedType)) {
    value = {
      kind: 'ObjectValue',
      fields: [],
    };
  }

  return {
    kind: 'ObjectField',
    name: {
      kind: 'Name',
      value: name,
    },
    value,
  };
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
): ObjectFieldNode {
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
    return prevString?.length === nextString?.length && prevString === nextString;
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
