import {
  ArgumentNode,
  GraphQLArgument,
  GraphQLInputField,
  GraphQLInputFieldMap,
  GraphQLInputObjectType,
  ListValueNode,
  ObjectFieldNode,
  ObjectValueNode,
  ValueNode,
  isEnumType,
  isInputObjectType,
  isRequiredArgument,
  isRequiredInputField,
  isScalarType,
} from 'graphql';
import {
  DefaultValueCustomizerContext,
  DescriptionContext,
  OperationDefinitionContext,
  VariableHandlerContext,
} from './Context';
import React, { useCallback, useContext, useEffect, useRef } from 'react';
import {
  generateArgumentSelectionFromType,
  generateObjectFieldNodeFromInputField,
  getDefaultValueByType,
  hasList,
  mergeObjectFieldIntoArgument,
  mergeObjectFieldIntoObjectField,
  sourcesAreEqual,
  unwrapType,
} from './graphqlHelper';

import InputElement from './InputElement';
import Parent from './ParentDefinition';
import TrashIcon from './icons/Trash';
import TypeName from './TypeName';
import classnames from 'classnames';
import styles from './GraphiQLTree.module.scss';

export interface InputFieldProps {
  depth: number;
  inputField: GraphQLInputField;
  onEdit: (prevObjectFieldNode?: ObjectFieldNode, nextObjectFieldNode?: ObjectFieldNode) => void;
  objectFieldNode?: ObjectFieldNode;
  parent: Parent;
}

const InputField = React.memo(function InputField({
  depth,
  inputField,
  onEdit,
  objectFieldNode,
  parent,
}: InputFieldProps) {
  const customizeDefaultValue = useContext(DefaultValueCustomizerContext);
  const showDescription = useContext(DescriptionContext);
  const operationDefinition = useContext(OperationDefinitionContext);
  const variableHandler = useContext(VariableHandlerContext);
  const objectFieldNodeRef = useRef(objectFieldNode);
  const parentRef = useRef({ definition: inputField, parent });
  const { name, type } = inputField;
  const isRequired = isRequiredInputField(inputField);
  const unwrappedType = unwrapType(type);
  const description = inputField.description || unwrappedType.description;

  useEffect(() => {
    objectFieldNodeRef.current = objectFieldNode;
  }, [objectFieldNode]);

  const defaultObjectField: ObjectFieldNode = generateObjectFieldNodeFromInputField(
    inputField,
    parent,
    customizeDefaultValue,
  );

  const onAddRow = () => {
    const nextObjectFieldNode: ObjectFieldNode = {
      ...objectFieldNodeRef.current!,
      value: {
        ...objectFieldNodeRef.current!.value,
        values: [
          ...((objectFieldNodeRef.current!.value as ListValueNode).values || []),
          ...(getDefaultValueByType(
            type,
            parentRef.current,
            customizeDefaultValue,
          ) as ListValueNode).values,
        ],
      } as ListValueNode,
    };
    onEdit(objectFieldNodeRef.current, nextObjectFieldNode);
  };

  const onEditInputField = useCallback(
    (index?: number) => (_prevValueNode?: ValueNode, nextValueNode?: ValueNode) => {
      const nextObjectFieldNode: ObjectFieldNode = {
        ...objectFieldNodeRef.current!,
        value: Number.isInteger(index)
          ? ({
              kind: 'ListValue',
              values: (objectFieldNodeRef.current!.value as ListValueNode).values.map((v, i) =>
                i === index ? nextValueNode : v,
              ),
            } as ListValueNode)
          : nextValueNode!,
      };
      onEdit(objectFieldNodeRef.current, nextObjectFieldNode);
    },
    [objectFieldNodeRef, onEdit],
  );

  const onEditInputObjectField = useCallback(
    (index?: number) => (
      prevObjectFieldNode?: ObjectFieldNode,
      nextObjectFieldNode?: ObjectFieldNode,
    ) => {
      const nextParentObjectFieldNode: ObjectFieldNode = mergeObjectFieldIntoObjectField(
        objectFieldNodeRef.current!,
        prevObjectFieldNode,
        nextObjectFieldNode,
        index,
      );
      onEdit(objectFieldNodeRef.current, nextParentObjectFieldNode);
    },
    [objectFieldNodeRef, onEdit],
  );

  const onRemoveRow = (index: number) => () => {
    if (index === 0) {
      return;
    }
    const nextObjectFieldNode: ObjectFieldNode = {
      ...objectFieldNodeRef.current!,
      value: {
        ...objectFieldNodeRef.current!.value,
        values: ((objectFieldNodeRef.current!.value as ListValueNode).values || []).filter(
          (_v, i) => i !== index,
        ),
      } as ListValueNode,
    };
    onEdit(objectFieldNodeRef.current, nextObjectFieldNode);
  };

  const onToggleInputField = () => {
    if (isRequired) {
      // Don't allow toggling of required argument
      return;
    }
    if (!objectFieldNodeRef.current) {
      onEdit(objectFieldNodeRef.current, defaultObjectField);
    } else {
      const prevVariableDefinition = operationDefinition?.variableDefinitions?.find(
        ({ variable }) => variable.name.value === name,
      );

      // This is a hack until we find a more elegant way of propagating changes for both
      // leaf (at any depth) and root. Right now we let the variableDefinition changes
      // finish and then make the changes to the argumentNode.
      variableHandler(prevVariableDefinition, undefined);
      setTimeout(() => onEdit(objectFieldNodeRef.current, undefined), 50);
    }
  };

  const isList = hasList(type);
  const hasFields = isInputObjectType(unwrappedType);
  const isSelected = Boolean(objectFieldNode) || isRequired;

  return (
    <div className={classnames(styles.inputField, `depth-${depth}`)} data-name={name}>
      <label>
        <span className={styles.checkboxGroup}>
          {hasFields && (
            <span className={`CodeMirror-foldgutter-${isSelected ? 'open' : 'folded'}`} />
          )}

          <span className={styles.checkbox}>
            <input
              checked={isSelected}
              disabled={isRequired}
              onChange={onToggleInputField}
              type="checkbox"
              value={isSelected.toString()}
            />
          </span>

          <span className={classnames('arg-name', 'cm-attribute', styles.selectable)}>{name}</span>
        </span>
        <TypeName className={styles.selectable} isInputType type={type} />
      </label>

      {isSelected &&
        !isInputObjectType(unwrappedType) &&
        (isList ? (
          <>
            {(objectFieldNode?.value as ListValueNode).values?.map(
              (v: ValueNode, index: number) => (
                <div
                  className={classnames(styles.inputElementContainer, styles.indented)}
                  key={index}
                >
                  <InputElement
                    defaultValue={defaultObjectField.value}
                    depth={depth}
                    isRequired={isRequiredInputField(inputField)}
                    name={inputField.name}
                    onEdit={onEditInputField(index)}
                    parent={parentRef.current}
                    type={type}
                    value={v}
                  />
                  <div
                    className={classnames(styles.removeRow, styles.removeScalar, {
                      [styles.disabled]: index === 0,
                    })}
                    onClick={onRemoveRow(index)}
                  >
                    <TrashIcon className={styles.trash} title="Remove row" />
                  </div>
                </div>
              ),
            )}
            <div className={styles.addRow}>
              <span onClick={onAddRow}>Add row</span>
            </div>
          </>
        ) : (
          <div className={styles.indented}>
            <InputElement
              defaultValue={defaultObjectField.value}
              depth={depth}
              isRequired={isRequiredInputField(inputField)}
              name={inputField.name}
              onEdit={onEditInputField()}
              parent={parentRef.current}
              type={type}
              value={objectFieldNode?.value}
            />
          </div>
        ))}

      {showDescription && description && (
        <div className={classnames(styles.description, styles.indented)}>{description}</div>
      )}

      {(() => {
        if (isInputObjectType(unwrappedType) && isSelected) {
          const fields = unwrappedType.getFields();
          const sortedFields = Object.values(fields).sort((a, b) =>
            a.name === 'id' ? -1 : a.name.localeCompare(b.name),
          );
          const objectFieldNodes: readonly ObjectFieldNode[] = (objectFieldNode!
            .value as ObjectValueNode)?.fields;
          return isList ? (
            <>
              {(objectFieldNode?.value as ListValueNode).values?.map(
                (v: ValueNode, index: number) => (
                  <div className={classnames(styles.argumentFields, styles.listable)} key={index}>
                    <div
                      className={classnames(styles.removeRow, styles.removeInputObject, {
                        [styles.disabled]: index === 0,
                      })}
                      onClick={onRemoveRow(index)}
                    >
                      <TrashIcon className={styles.trash} title="Remove row" />
                    </div>
                    {sortedFields.map(field => (
                      <InputField
                        depth={depth + 1}
                        inputField={field}
                        key={`[${index}].${field.name}`}
                        onEdit={onEditInputObjectField(index)}
                        objectFieldNode={(v as ObjectValueNode)?.fields?.find(
                          ({ name }) => name.value === field.name,
                        )}
                        parent={parentRef.current}
                      />
                    ))}
                  </div>
                ),
              )}
              <div className={styles.addRow}>
                <span onClick={onAddRow}>Add row</span>
              </div>
            </>
          ) : (
            <div className={classnames(styles.argumentFields)}>
              {sortedFields.map(field => (
                <InputField
                  depth={depth + 1}
                  inputField={field}
                  key={field.name}
                  onEdit={onEditInputObjectField()}
                  objectFieldNode={objectFieldNodes?.find(({ name }) => name.value === field.name)}
                  parent={parentRef.current}
                />
              ))}
            </div>
          );
        }
      })()}
    </div>
  );
},
sourcesAreEqual('objectFieldNode'));

export interface ArgumentProps {
  argument: GraphQLArgument; // Schema
  argumentNode?: ArgumentNode; // Selection
  depth: number;
  onEdit: (prevArgumentNode?: ArgumentNode, nextArgumentNode?: ArgumentNode) => void;
  parent: Parent;
}

const Argument = React.memo(function Argument({
  argument,
  argumentNode,
  depth,
  onEdit,
  parent,
}: ArgumentProps) {
  const { description, name, type } = argument;
  const isRequired = isRequiredArgument(argument);
  const argumentNodeRef = useRef(argumentNode);
  const parentRef = useRef({ definition: argument, parent });
  const customizeDefaultValue = useContext(DefaultValueCustomizerContext);
  const showDescription = useContext(DescriptionContext);
  const operationDefinition = useContext(OperationDefinitionContext);
  const variableHandler = useContext(VariableHandlerContext);

  useEffect(() => {
    argumentNodeRef.current = argumentNode;
  }, [argumentNode]);

  const defaultArgument: ArgumentNode = generateArgumentSelectionFromType(
    argument,
    parent,
    customizeDefaultValue,
  );

  const onAddArgumentRow = () => {
    const nextArgumentNode: ArgumentNode = {
      ...argumentNodeRef.current!,
      value: {
        ...argumentNodeRef.current!.value,
        values: [
          ...((argumentNodeRef.current!.value as ListValueNode).values || []),
          ...(getDefaultValueByType(
            type,
            parentRef.current,
            customizeDefaultValue,
          ) as ListValueNode).values,
        ],
      } as ListValueNode,
    };
    onEdit(argumentNodeRef.current, nextArgumentNode);
  };

  const onEditArgument = (index?: number) => (
    _prevValueNode?: ValueNode,
    nextValueNode?: ValueNode,
  ) => {
    const isList = Number.isInteger(index);
    let nextArgumentNode: ArgumentNode;
    if (isList) {
      nextArgumentNode = {
        ...argumentNodeRef.current!,
        value: {
          ...argumentNodeRef.current!.value,
          values: ((argumentNodeRef.current!.value as ListValueNode).values || []).map((v, i) =>
            i === index ? nextValueNode : v,
          ),
        } as ListValueNode,
      };
    } else {
      nextArgumentNode = {
        ...argumentNodeRef.current!,
        value: nextValueNode!,
      };
    }

    onEdit(argumentNodeRef.current, nextArgumentNode);
  };

  const onEditInputField = useCallback(
    (index?: number) => (
      prevObjectFieldNode?: ObjectFieldNode,
      nextObjectFieldNode?: ObjectFieldNode,
    ) => {
      const nextArgumentNode = mergeObjectFieldIntoArgument(
        argumentNodeRef.current!,
        prevObjectFieldNode,
        nextObjectFieldNode,
        index,
      );
      onEdit(argumentNodeRef.current, nextArgumentNode);
    },
    [argumentNodeRef, onEdit],
  );

  const onRemoveArgumentRow = (index: number) => () => {
    if (index === 0) {
      return;
    }
    const nextArgumentNode: ArgumentNode = {
      ...argumentNodeRef.current!,
      value: {
        ...argumentNodeRef.current!.value,
        values: ((argumentNodeRef.current!.value as ListValueNode).values || []).filter(
          (_v, i) => i !== index,
        ),
      } as ListValueNode,
    };
    onEdit(argumentNodeRef.current, nextArgumentNode);
  };

  const onToggleArgument = useCallback(() => {
    if (isRequired) {
      // Don't allow toggling of required argument
      return;
    }
    if (!argumentNodeRef.current) {
      onEdit(argumentNodeRef.current, defaultArgument);
    } else {
      const prevVariableDefinition = operationDefinition?.variableDefinitions?.find(
        ({ variable }) => variable.name.value === name,
      );

      // This is a hack until we find a more elegant way of propagating changes for both
      // leaf (at any depth) and root. Right now we let the variableDefinition changes
      // finish and then make the changes to the argumentNode.
      variableHandler(prevVariableDefinition, undefined);
      setTimeout(() => onEdit(argumentNodeRef.current, undefined), 50);
    }
  }, [
    argumentNodeRef,
    defaultArgument,
    isRequired,
    name,
    onEdit,
    operationDefinition,
    variableHandler,
  ]);

  const unwrappedType = unwrapType(type);
  const hasFields = isInputObjectType(unwrappedType);
  const isList = hasList(type);
  const isSelected = Boolean(argumentNode) || isRequired;

  return (
    <div className={classnames(styles.argument, styles.node, `depth-${depth}`)} data-name={name}>
      <label>
        <span className={styles.checkboxGroup}>
          {hasFields && (
            <span
              className={classnames(
                styles.selectable,
                isSelected ? 'CodeMirror-foldgutter-open' : 'CodeMirror-foldgutter-folded',
              )}
            />
          )}
          <span className={styles.checkbox}>
            <input
              checked={isSelected}
              disabled={isRequired}
              onChange={onToggleArgument}
              type="checkbox"
              value={isSelected.toString()}
            />
          </span>
          <span className={classnames('arg-name', 'cm-attribute', styles.selectable)}>{name}</span>
        </span>
        <TypeName className={styles.selectable} isInputType type={type} />
      </label>

      {(isScalarType(unwrappedType) || isEnumType(unwrappedType)) &&
        isSelected &&
        (isList ? (
          <>
            {((argumentNode?.value as ListValueNode).values || []).map((v, i) => (
              <div className={classnames(styles.inputElementContainer, styles.indented)} key={i}>
                <InputElement
                  defaultValue={defaultArgument.value}
                  depth={depth}
                  key={`[${i}].${name}`}
                  name={name}
                  isRequired={isRequiredArgument(argument)}
                  onEdit={onEditArgument(i)}
                  parent={parentRef.current}
                  type={unwrappedType}
                  value={v}
                />
                <div
                  className={classnames(styles.removeRow, styles.removeScalar, {
                    [styles.disabled]: i === 0,
                  })}
                  onClick={onRemoveArgumentRow(i)}
                >
                  <TrashIcon className={styles.trash} title="Remove row" />
                </div>
              </div>
            ))}
            <div className={styles.addRow}>
              <span onClick={onAddArgumentRow}>Add row</span>
            </div>
          </>
        ) : (
          <div className={classnames(styles.indented)}>
            <InputElement
              defaultValue={defaultArgument.value}
              depth={depth}
              key={name}
              name={name}
              isRequired={isRequiredArgument(argument)}
              onEdit={onEditArgument()}
              parent={parentRef.current}
              type={unwrappedType}
              value={argumentNode?.value}
            />
          </div>
        ))}

      {showDescription && description && (
        <div className={classnames(styles.description, styles.indented)}>{description}</div>
      )}

      {(() => {
        if (isInputObjectType(unwrappedType) && isSelected) {
          const fields: GraphQLInputFieldMap = (unwrappedType as GraphQLInputObjectType).getFields();
          const sortedFields = Object.values(fields).sort((a, b) =>
            a.name === 'id' ? -1 : a.name.localeCompare(b.name),
          );
          const objectFieldNodes: readonly ObjectFieldNode[] = (argumentNode?.value as ObjectValueNode)
            ?.fields;
          return isList ? (
            <>
              {((argumentNode?.value as ListValueNode).values || []).map(
                (v: ValueNode, i: number) => (
                  <div className={classnames(styles.argumentFields, styles.listable)} key={i}>
                    <div
                      className={classnames(styles.removeRow, styles.removeInputObject, {
                        [styles.disabled]: i === 0,
                      })}
                      onClick={onRemoveArgumentRow(i)}
                    >
                      <TrashIcon className={styles.trash} title="Remove row" />
                    </div>
                    {sortedFields.map(field => (
                      <InputField
                        depth={depth + 1}
                        inputField={field}
                        key={`[${i}].${field.name}`}
                        onEdit={onEditInputField(i)}
                        objectFieldNode={(v as ObjectValueNode)?.fields?.find(
                          ({ name }) => name.value === field.name,
                        )}
                        parent={parentRef.current}
                      />
                    ))}
                  </div>
                ),
              )}
              <div className={styles.addRow}>
                <span onClick={onAddArgumentRow}>Add row</span>
              </div>
            </>
          ) : (
            <div className={styles.argumentFields}>
              {sortedFields.map(field => (
                <InputField
                  depth={depth + 1}
                  inputField={field}
                  key={field.name}
                  onEdit={onEditInputField()}
                  objectFieldNode={objectFieldNodes?.find(({ name }) => name.value === field.name)}
                  parent={parentRef.current}
                />
              ))}
            </div>
          );
        }
      })()}
    </div>
  );
},
sourcesAreEqual('argumentNode'));

export { Argument };
