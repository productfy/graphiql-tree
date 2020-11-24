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
  isObjectType,
  isWrappingType,
  print,
} from 'graphql';
import unionBy from 'lodash/unionBy';
import parserGraphql from 'prettier/parser-graphql';
import prettier from 'prettier/standalone';

export function generateArgumentSelectionFromType(arg: GraphQLArgument): ArgumentNode {
  const { name, type } = arg;

  let value: ValueNode = {
    kind: 'StringValue',
    value: '',
  };

  if (isInputObjectType(type)) {
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

export function generateObjectFieldNodeFromInputField(field: GraphQLInputField): ObjectFieldNode {
  const { name } = field;
  return {
    kind: 'ObjectField',
    name: {
      kind: 'Name',
      value: name,
    },
    value: {
      kind: 'StringValue',
      value: '',
    },
  };
}

export function generateOutputFieldSelectionFromType(field: GraphQLField<any, any>): FieldNode {
  const { name, type } = field;
  let selectionSet: SelectionSetNode | undefined = undefined;
  if (isObjectType(type)) {
    selectionSet = {
      kind: 'SelectionSet',
      selections: [],
    };
  }
  return {
    kind: 'Field',
    name: {
      kind: 'Name',
      value: name,
    },
    selectionSet,
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

export function mergeArgumentIntoSelection(
  selectionNode: FieldNode,
  prevArgumentNode?: ArgumentNode,
  nextArgumentNode?: ArgumentNode,
): FieldNode {
  // No-op
  if (prevArgumentNode === nextArgumentNode) {
    return selectionNode;
  }
  // Remove
  if (prevArgumentNode && !nextArgumentNode) {
    return {
      ...selectionNode,
      arguments: selectionNode.arguments?.filter(
        arg => arg.name.value !== prevArgumentNode.name.value,
      ),
    };
  }
  // Add
  if (!prevArgumentNode && nextArgumentNode) {
    return {
      ...selectionNode,
      arguments: [...(selectionNode.arguments || []), nextArgumentNode!].sort((a, b) =>
        a.name.value.localeCompare(b.name.value),
      ),
    };
  }
  // Update
  return {
    ...selectionNode,
    arguments: unionBy([nextArgumentNode!], selectionNode.arguments, 'name.value'),
  };
}

export function mergeInputFieldIntoArgument(
  argumentNode: ArgumentNode,
  prevObjectFieldNode?: ObjectFieldNode,
  nextObjectFieldNode?: ObjectFieldNode,
): ArgumentNode {
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
        fields: (argumentNode.value as ObjectValueNode).fields.filter(
          field => field.name.value !== prevObjectFieldNode.name.value,
        ),
      } as ObjectValueNode,
    };
  }
  // Add
  if (!prevObjectFieldNode && nextObjectFieldNode) {
    return {
      ...argumentNode,
      value: {
        ...argumentNode.value,
        fields: [
          ...(argumentNode.value as ObjectValueNode).fields,
          nextObjectFieldNode,
        ].sort((a, b) => a.name.value.localeCompare(b.name.value)),
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
      ),
    } as ObjectValueNode,
  };
}

export function mergeOperationIntoDocument(
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
  prevSelectionNode?: FieldNode,
  nextSelectionNode?: FieldNode,
): SelectionSetNode {
  // No-op
  if (prevSelectionNode === nextSelectionNode) {
    return selectionSetNode;
  }
  // Remove
  if (prevSelectionNode && !nextSelectionNode) {
    return {
      ...selectionSetNode,
      selections: selectionSetNode.selections?.filter(
        sel => (sel as FieldNode).name.value !== prevSelectionNode.name.value,
      ),
    };
  }
  // Add
  if (!prevSelectionNode && nextSelectionNode) {
    return {
      ...selectionSetNode,
      selections: [...(selectionSetNode.selections || []), nextSelectionNode],
    };
  }
  // Update
  return {
    ...selectionSetNode,
    selections: unionBy([nextSelectionNode!], selectionSetNode.selections, 'name.value'),
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

export function mergeSelectionSetIntoOperation(
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
