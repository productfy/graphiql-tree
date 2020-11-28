import classnames from 'classnames';
import {
  ArgumentNode,
  GraphQLArgument,
  GraphQLInputField,
  GraphQLInputObjectType,
  ListValueNode,
  ObjectFieldNode,
  ObjectValueNode,
  ValueNode,
  isEnumType,
  isInputObjectType,
  isListType,
  isRequiredArgument,
  isRequiredInputField,
  isScalarType,
  GraphQLInputFieldMap,
} from 'graphql';
import React, { useCallback, useContext, useEffect, useRef } from 'react';

import { DefaultValueCustomizerContext } from './Context';
import {
  generateArgumentSelectionFromType,
  generateObjectFieldNodeFromInputField,
  getDefaultValueByType,
  mergeObjectFieldIntoArgument,
  mergeObjectFieldIntoObjectField,
  sourcesAreEqual,
  unwrapType,
} from './graphqlHelper';
import InputElement from './InputElement';
import ParentDefinition from './ParentDefinition';
import trashIcon from './icons/trash.svg';
import TypeName from './TypeName';

import styles from './GraphiQLTree.module.scss';

export interface InputFieldProps {
  depth: number;
  inputField: GraphQLInputField;
  onEdit: (prevObjectFieldNode?: ObjectFieldNode, nextObjectFieldNode?: ObjectFieldNode) => void;
  objectFieldNode?: ObjectFieldNode;
  parentDefinition: ParentDefinition;
}

const InputField = React.memo(function InputField({
  depth,
  inputField,
  onEdit,
  objectFieldNode,
  parentDefinition,
}: InputFieldProps) {
  const objectFieldNodeRef = useRef(objectFieldNode);
  const parentDefinitionRef = useRef({ definition: inputField, parentDefinition });
  const { description, name, type } = inputField;
  const isRequired = isRequiredInputField(inputField);
  const unwrappedType = unwrapType(type);

  useEffect(() => {
    objectFieldNodeRef.current = objectFieldNode;
  }, [objectFieldNode]);

  const onAddInputFieldRow = () => {
    const nextObjectFieldNode: ObjectFieldNode = {
      ...objectFieldNodeRef.current!,
      value: {
        ...objectFieldNodeRef.current!.value,
        values: [
          ...((objectFieldNodeRef.current!.value as ListValueNode).values || []),
          getDefaultValueByType(unwrappedType),
        ],
      } as ListValueNode,
    };
    onEdit(objectFieldNodeRef.current, nextObjectFieldNode);
  };

  const onEditInputField = useCallback(
    (_prevValueNode?: ValueNode, nextValueNode?: ValueNode) => {
      const nextObjectFieldNode: ObjectFieldNode = {
        ...objectFieldNodeRef.current!,
        value: nextValueNode!,
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

  const onRemoveInputFieldRow = (index: number) => () => {
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
      const nextObjectFieldNode: ObjectFieldNode = generateObjectFieldNodeFromInputField(
        inputField,
      );
      onEdit(objectFieldNodeRef.current, nextObjectFieldNode);
    } else {
      onEdit(objectFieldNodeRef.current, undefined);
    }
  };

  const isList = isListType(type);
  const isSelected = Boolean(objectFieldNode) || isRequired;

  return (
    <div className={classnames(styles.inputField, `depth-${depth}`)}>
      <label>
        <span className={styles.checkbox}>
          <input
            checked={isSelected}
            disabled={isRequired}
            onChange={onToggleInputField}
            type="checkbox"
            value={isSelected.toString()}
          />
        </span>

        <span className={classnames('arg-name', styles.selectable)}>{name}</span>

        <TypeName className={styles.selectable} isInputType type={type} />
      </label>

      {isSelected && !isList && !isInputObjectType(unwrappedType) && (
        <InputElement
          depth={depth}
          isRequired={isRequiredInputField(inputField)}
          name={inputField.name}
          onEdit={onEditInputField}
          parentDefinition={parentDefinitionRef.current}
          type={type}
          value={objectFieldNode?.value}
        />
      )}

      {description && (
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
                (v: ValueNode, index: number) => {
                  return (
                    <div className={classnames(styles.argumentFields)} key={index}>
                      <div
                        className={classnames(styles.removeRow, {
                          [styles.disabled]: index === 0,
                        })}
                        onClick={onRemoveInputFieldRow(index)}
                      >
                        <img src={trashIcon} alt="Remove row" />
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
                          parentDefinition={parentDefinitionRef.current}
                        />
                      ))}
                    </div>
                  );
                },
              )}
              <div className={styles.addRow} onClick={onAddInputFieldRow}>
                Add row
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
                  parentDefinition={parentDefinitionRef.current}
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
  parentDefinition: ParentDefinition;
}

const Argument = React.memo(function Argument({
  argument,
  argumentNode,
  depth,
  onEdit,
  parentDefinition,
}: ArgumentProps) {
  const { description, name, type } = argument;
  const isRequired = isRequiredArgument(argument);
  const argumentNodeRef = useRef(argumentNode);
  const parentDefinitionRef = useRef({ definition: argument, parentDefinition });
  const customizeDefaultValue = useContext(DefaultValueCustomizerContext);

  useEffect(() => {
    argumentNodeRef.current = argumentNode;
  }, [argumentNode]);

  const onAddArgumentRow = () => {
    const nextArgumentNode: ArgumentNode = {
      ...argumentNodeRef.current!,
      value: {
        ...argumentNodeRef.current!.value,
        values: [
          ...((argumentNodeRef.current!.value as ListValueNode).values || []),
          getDefaultValueByType(unwrappedType),
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
    (prevObjectFieldNode?: ObjectFieldNode, nextObjectFieldNode?: ObjectFieldNode) => {
      const nextArgumentNode = mergeObjectFieldIntoArgument(
        argumentNodeRef.current!,
        prevObjectFieldNode,
        nextObjectFieldNode,
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
      const nextArgumentNode: ArgumentNode = generateArgumentSelectionFromType(
        argument,
        parentDefinitionRef.current,
        customizeDefaultValue,
      );
      onEdit(argumentNodeRef.current, nextArgumentNode);
    } else {
      onEdit(argumentNodeRef.current, undefined);
    }
  }, [argument, argumentNodeRef, customizeDefaultValue, isRequired, onEdit]);

  const unwrappedType = unwrapType(type);
  const hasFields = isInputObjectType(unwrappedType);
  const isList = isListType(type);
  const isSelected = Boolean(argumentNode) || isRequired;

  return (
    <div className={classnames(styles.argument, styles.node, `depth-${depth}`)}>
      <label>
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
        <span className={classnames('arg-name', styles.selectable)}>{name}</span>
        <TypeName className={styles.selectable} isInputType type={type} />
      </label>

      {(isScalarType(unwrappedType) || isEnumType(unwrappedType)) &&
        isSelected &&
        (isList ? (
          <>
            {((argumentNode?.value as ListValueNode).values || []).map((v, i) => (
              <div className={styles.inputElementContainer} key={i}>
                <InputElement
                  depth={depth}
                  key={`[${i}].${name}`}
                  name={name}
                  isRequired={isRequiredArgument(argument)}
                  onEdit={onEditArgument(i)}
                  parentDefinition={parentDefinitionRef.current}
                  type={unwrappedType}
                  value={v}
                />
                <div
                  className={classnames(styles.removeRow, {
                    [styles.disabled]: i === 0,
                  })}
                  onClick={onRemoveArgumentRow(i)}
                >
                  <img src={trashIcon} alt="Remove row" />
                </div>
              </div>
            ))}
            <div className={styles.addRow} onClick={onAddArgumentRow}>
              Add row
            </div>
          </>
        ) : (
          <InputElement
            depth={depth}
            key={name}
            name={name}
            isRequired={isRequiredArgument(argument)}
            onEdit={onEditArgument()}
            parentDefinition={parentDefinitionRef.current}
            type={unwrappedType}
            value={argumentNode?.value}
          />
        ))}

      {description && (
        <div className={classnames(styles.description, styles.indented)}>{description}</div>
      )}

      {(() => {
        if (isInputObjectType(unwrappedType) && isSelected) {
          const fields: GraphQLInputFieldMap = (unwrappedType as GraphQLInputObjectType).getFields();
          const objectFieldNodes: readonly ObjectFieldNode[] = (argumentNode?.value as ObjectValueNode)
            ?.fields;
          return (
            <div className={classnames(styles.argumentFields)}>
              {Object.values(fields)
                .sort((a, b) => (a.name === 'id' ? -1 : a.name.localeCompare(b.name)))
                .map(field => (
                  <InputField
                    depth={depth + 1}
                    inputField={field}
                    key={field.name}
                    onEdit={onEditInputField}
                    objectFieldNode={objectFieldNodes?.find(
                      ({ name }) => name.value === field.name,
                    )}
                    parentDefinition={parentDefinitionRef.current}
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
