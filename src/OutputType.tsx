import {
  ArgumentNode,
  FieldNode,
  GraphQLField,
  GraphQLObjectType,
  GraphQLOutputType,
  InlineFragmentNode,
  SelectionSetNode,
  isInterfaceType,
  isObjectType,
} from 'graphql';
import {
  DefaultValueCustomizerContext,
  DescriptionContext,
  DescriptionCustomizerContext,
  SchemaContext,
} from './Context';
import {
  generateInlineFragmentFromType,
  generateOutputFieldSelectionFromType,
  mergeArgumentIntoField,
  mergeFieldIntoInlineFragment,
  mergeSelectionIntoSelectionSet,
  mergeSelectionSetIntoSelection,
  sourcesAreEqual,
  unwrapType,
} from './graphqlHelper';
import { memo, useCallback, useContext, useEffect, useRef } from 'react';

import { Argument } from './InputType';
import type Parent from './ParentDefinition';
import TypeName from './TypeName';
import classnames from 'classnames';
import styles from './GraphiQLTree.module.scss';

export interface FieldProps {
  depth: number;
  field: GraphQLField<any, any>;
  onEdit: (prevField?: FieldNode, nextField?: FieldNode) => void;
  parent: Parent;
  selectionNode?: FieldNode;
}

const nameSorter = (a: { name: string }, b: { name: string }) =>
  a.name === 'id' ? -1 : b.name === 'id' ? 1 : a.name.localeCompare(b.name);

const Field = memo(function Field({
  depth,
  field,
  onEdit,
  parent,
  selectionNode,
}: FieldProps) {
  const customizeDefaultValue = useContext(DefaultValueCustomizerContext);
  const customizeDescription = useContext(DescriptionCustomizerContext);
  const showDescription = useContext(DescriptionContext);
  const parentRef = useRef({ definition: field, parent });
  const selectionNodeRef = useRef(selectionNode);

  useEffect(() => {
    selectionNodeRef.current = selectionNode;
  }, [selectionNode]);

  const onEditArgument = useCallback(
    (prevArgumentNode?: ArgumentNode, nextArgumentNode?: ArgumentNode) => {
      const nextSelectionNode = mergeArgumentIntoField(
        selectionNodeRef.current!,
        prevArgumentNode,
        nextArgumentNode,
      );
      onEdit(selectionNodeRef.current, nextSelectionNode);
    },
    [onEdit, selectionNodeRef],
  );

  const onEditType = useCallback(
    (prevSelectionSetNode?: SelectionSetNode, nextSelectionSetNode?: SelectionSetNode) => {
      const nextSelectionNode = mergeSelectionSetIntoSelection(
        selectionNodeRef.current!,
        prevSelectionSetNode,
        nextSelectionSetNode,
      ) as FieldNode;
      onEdit(selectionNodeRef.current, nextSelectionNode);
    },
    [onEdit, selectionNodeRef],
  );

  const onToggleField = useCallback(() => {
    // if (depth === 4) {
    //   return;
    // }
    if (!selectionNodeRef.current) {
      const nextSelectionNode = generateOutputFieldSelectionFromType(
        field,
        parentRef.current,
        customizeDefaultValue,
      );
      onEdit(selectionNodeRef.current, nextSelectionNode as FieldNode);
    } else {
      onEdit(selectionNodeRef.current, undefined);
    }
  }, [
    // depth,
    customizeDefaultValue,
    field,
    onEdit,
    selectionNodeRef,
  ]);

  const { args, name, type } = field;
  const unwrappedType = unwrapType(type);
  const hasArgs = args.length > 0;
  const hasFields =
    isObjectType(unwrappedType) ||
    (isInterfaceType(unwrappedType) && Object.keys(unwrappedType.getFields()).length > 0);
  const isSelected = Boolean(selectionNode);
  const description =
    customizeDescription(field, parentRef.current.parent) ||
    field.description ||
    unwrappedType.description;

  return (
    <div className={classnames(styles.node, styles.fieldNode, `depth-${depth}`)}>
      <label className={classnames(styles.nameLine, styles.selectable)}>
        <span className={styles.checkboxGroup}>
          {hasFields && (
            <>
              {depth !== 4 && (
                <span className={`CodeMirror-foldgutter-${isSelected ? 'open' : 'folded'}`} />
              )}
              <span
                className={classnames(styles.checkbox, {
                  [styles.hidden]: depth === 4,
                })}
              >
                <input
                  checked={isSelected}
                  onChange={onToggleField}
                  type="checkbox"
                  value={isSelected.toString()}
                />
              </span>
            </>
          )}

          {!hasFields && depth !== 4 && (
            <span className={styles.checkbox}>
              <input
                checked={isSelected}
                onChange={onToggleField}
                type="checkbox"
                value={isSelected.toString()}
              />
            </span>
          )}

          <span className={classnames('field-name', 'cm-property')}>{name}</span>
        </span>
        {depth !== 4 && <TypeName type={type} />}
        {/* {!selected && hasArgs && <span className="cm-punctuation">()</span>}
        {(!selected || !hasFields) && (
          <>
            <span className="cm-punctuation">: </span>
            <TypeName type={type} />
          </>
        )}
        {selected && hasArgs && <span className="cm-punctuation">(</span>}
        {selected && hasFields && !hasArgs && <span className="cm-punctuation">{' {'}</span>} */}
      </label>
      {showDescription && description && (
        <div className={classnames(styles.description, { [styles.indented]: depth !== 4 })}>
          {description}
        </div>
      )}

      {/* field.astNode.directives[], where name.value === 'auth', then grab arguments[0].value.values.map(({ value }) => value) */}
      {/* Add a DirectiveElement (where we pass in a element generator at the root component) */}
      {/* {isSelected && <div>Directives</div>} */}

      {isSelected && (hasArgs || hasFields) && (
        <div className={classnames(styles.fieldNodeBody, `depth-${depth}`)}>
          {hasArgs && (
            <>
              {depth === 4 && <h5 className={styles.parameters}>Parameters</h5>}
              <div className={classnames(styles.arguments, `depth-${depth}`)}>
                {(args || []).sort(nameSorter).map(arg => (
                  <Argument
                    argument={arg}
                    argumentNode={(selectionNode as FieldNode)?.arguments?.find(
                      argument => argument.name.value === arg.name,
                    )}
                    depth={depth + 1}
                    key={arg.name}
                    onEdit={onEditArgument}
                    parent={parentRef.current}
                  />
                ))}
              </div>
              {/* <div>
                  <span className={styles.spacer} />
                  <span className="cm-punctuation">): </span>
                  {hasFields && <TypeName type={type} />}
                  {hasFields && <span className="cm-punctuation">{' {'}</span>}
                </div> */}
            </>
          )}

          {depth === 4 && (
            <h5 className={styles.returns}>
              <span>Returns</span> <TypeName type={type} />
            </h5>
          )}

          {hasFields && (
            <Type
              depth={depth + 1}
              onEdit={onEditType}
              parent={parentRef.current}
              selectionSetNode={selectionNode!.selectionSet!}
              type={type}
            />
          )}

          {/* {hasFields && <div className="cm-punctuation">{'}'}</div>} */}
        </div>
      )}
    </div>
  );
},
sourcesAreEqual('selectionNode'));

export interface ImplementationTypeProps {
  depth: number;
  onEdit: (prevSelection?: InlineFragmentNode, nextSelection?: InlineFragmentNode) => void;
  parent: Parent;
  selectionNode?: InlineFragmentNode;
  type: GraphQLObjectType;
}

const ImplementationType = memo(function Type({
  depth,
  onEdit,
  parent,
  selectionNode,
  type,
}: ImplementationTypeProps) {
  const unwrappedType = unwrapType(type);
  const parentRef = useRef({ definition: type, parent });
  const selectionNodeRef = useRef(selectionNode);

  useEffect(() => {
    selectionNodeRef.current = selectionNode;
  }, [selectionNode]);

  const onEditField = useCallback(
    (prevField?: FieldNode, nextField?: FieldNode) => {
      const nextSelection = mergeFieldIntoInlineFragment(
        selectionNodeRef.current!,
        prevField,
        nextField,
      );
      onEdit(selectionNodeRef.current, nextSelection);
    },
    [onEdit, selectionNodeRef],
  );

  const onToggleType = useCallback(() => {
    if (!selectionNodeRef.current) {
      const nextSelectionNode: InlineFragmentNode = generateInlineFragmentFromType(unwrappedType);
      onEdit(selectionNodeRef.current, nextSelectionNode);
    } else {
      onEdit(selectionNodeRef.current, undefined);
    }
  }, [onEdit, selectionNodeRef, unwrappedType]);

  const isSelected = Boolean(selectionNode);
  // const interfaces: GraphQLInterfaceType[] = type.getInterfaces();
  return (
    <div className={classnames(styles.node, styles.implementationType, `depth-${depth}`)}>
      <label className={classnames('type-name', styles.selectable)}>
        <span className={`CodeMirror-foldgutter-${isSelected ? 'open' : 'folded'}`} />
        <span className={styles.checkbox}>
          <input
            checked={isSelected}
            onChange={onToggleType}
            type="checkbox"
            value={isSelected.toString()}
          />
        </span>
        <span className="cm-atom">{unwrappedType.name}</span>
        {/* <ul className={styles.interfaceList}>
          {interfaces.map((i: GraphQLInterfaceType) => (
            <li>
              <TypeName type={i} />
            </li>
          ))}
        </ul> */}
      </label>

      {(() => {
        if (!isSelected || !isObjectType(unwrappedType)) {
          return null;
        }
        const fields = unwrappedType.getFields();
        const selectionSetNode = selectionNode?.selectionSet;
        return (
          <div className={classnames({ [styles.typeFields]: depth > 5 })}>
            {Object.values(fields)
              .sort(nameSorter)
              .map(field => {
                const subSelectionNode = (selectionSetNode?.selections as FieldNode[])?.find(
                  selection => selection.name?.value === field.name,
                );
                return (
                  <Field
                    depth={depth + 1}
                    field={field}
                    key={field.name}
                    onEdit={onEditField}
                    parent={parentRef.current}
                    selectionNode={subSelectionNode}
                  />
                );
              })}
          </div>
        );
      })()}
    </div>
  );
},
sourcesAreEqual('selectionNode'));

export interface TypeProps {
  depth: number;
  onEdit: (prevSelectionSet?: SelectionSetNode, nextSelectionSet?: SelectionSetNode) => void;
  parent?: Parent;
  selectionSetNode: SelectionSetNode;
  type: GraphQLOutputType;
}

const Type = memo(function Type({
  depth,
  onEdit,
  parent,
  selectionSetNode,
  type,
}: TypeProps) {
  const schema = useContext(SchemaContext);
  const parentRef = useRef({ definition: type, parent });
  const selectionSetNodeRef = useRef(selectionSetNode);

  useEffect(() => {
    selectionSetNodeRef.current = selectionSetNode;
  }, [selectionSetNode]);

  const onEditField = useCallback(
    (prevSelectionNode?: FieldNode, nextSelectionNode?: FieldNode) => {
      const nextSelectionSet = mergeSelectionIntoSelectionSet(
        selectionSetNodeRef.current,
        prevSelectionNode,
        nextSelectionNode,
      );
      onEdit(selectionSetNodeRef.current, nextSelectionSet);
    },
    [onEdit, selectionSetNodeRef],
  );

  const onEditType = useCallback(
    (prevSelectionNode?: InlineFragmentNode, nextSelectionNode?: InlineFragmentNode) => {
      const nextSelectionSet = mergeSelectionIntoSelectionSet(
        selectionSetNodeRef.current,
        prevSelectionNode,
        nextSelectionNode,
      );
      onEdit(selectionSetNodeRef.current, nextSelectionSet);
    },
    [onEdit, selectionSetNodeRef],
  );

  if (!type) {
    return null;
  }
  const isSelected = Boolean(selectionSetNode);
  const unwrappedType = unwrapType(type);

  if (isInterfaceType(unwrappedType)) {
    const types = schema?.getPossibleTypes(unwrappedType) || [];
    const fields = unwrappedType.getFields();
    return (
      <>
        {
          // Interface part
          Object.values(fields)
            .sort(nameSorter)
            .map(field => {
              const selectionNode = selectionSetNode?.selections?.find(
                selection => selection.kind === 'Field' && selection.name?.value === field.name,
              ) as FieldNode | undefined;
              return (
                <Field
                  depth={depth + 1}
                  field={field}
                  key={field.name}
                  onEdit={onEditField}
                  parent={parentRef.current}
                  selectionNode={selectionNode}
                />
              );
            })
        }

        {
          // Implementations part
          types.map(type => {
            const selectionNode = selectionSetNode?.selections?.find(
              sel => sel.kind === 'InlineFragment' && sel.typeCondition?.name.value === type.name,
            ) as InlineFragmentNode | undefined;
            return (
              <ImplementationType
                depth={depth + 1}
                key={type.name}
                onEdit={onEditType}
                parent={parentRef.current}
                selectionNode={selectionNode}
                type={type}
              />
            );
          })
        }
      </>
    );
  }

  if (!isSelected) {
    return null;
  }

  if (isObjectType(unwrappedType)) {
    const fields = unwrappedType.getFields();
    return (
      <>
        {Object.values(fields)
          .sort(nameSorter)
          .map(field => {
            const selectionNode = (selectionSetNode?.selections as FieldNode[])?.find(
              selection => selection.name?.value === field.name,
            );
            // if (depth === 3 && !selectionNode) {
            //   return null;
            // }
            return (
              <Field
                depth={depth + 1}
                field={field}
                key={field.name}
                onEdit={onEditField}
                parent={parentRef.current}
                selectionNode={selectionNode}
              />
            );
          })}
      </>
    );
  }

  return <div>Unhandled type {unwrappedType.name}</div>;
},
sourcesAreEqual('selectionSetNode'));

export { Field, Type };
