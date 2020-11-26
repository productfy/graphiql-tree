import classnames from 'classnames';
import {
  ArgumentNode,
  GraphQLArgument,
  GraphQLInputField,
  ObjectFieldNode,
  ObjectValueNode,
  ValueNode,
  isInputObjectType,
  isRequiredArgument,
  isRequiredInputField,
  isScalarType,
  isEnumType,
} from 'graphql';
import React, { useCallback, useEffect, useRef } from 'react';

import {
  generateArgumentSelectionFromType,
  generateObjectFieldNodeFromInputField,
  mergeObjectFieldIntoArgument,
  sourcesAreEqual,
  unwrapType,
} from './graphqlHelper';
import InputElement from './InputElement';
import TypeName from './TypeName';

import styles from './GraphiQLTree.module.scss';

export interface InputFieldProps {
  depth: number;
  inputField: GraphQLInputField;
  onEdit: (prevObjectFieldNode?: ObjectFieldNode, nextObjectFieldNode?: ObjectFieldNode) => void;
  objectFieldNode?: ObjectFieldNode;
}

const InputField = React.memo(function InputField({
  depth,
  inputField,
  onEdit,
  objectFieldNode,
}: InputFieldProps) {
  const objectFieldNodeRef = useRef(objectFieldNode);
  const { description, name, type } = inputField;
  const isRequired = isRequiredInputField(inputField);
  const unwrappedType = unwrapType(type);

  useEffect(() => {
    objectFieldNodeRef.current = objectFieldNode;
  }, [objectFieldNode]);

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
    (_prevObjectFieldNode?: ObjectFieldNode, nextObjectFieldNode?: ObjectFieldNode) => {
      // Merge
      const nextParentObjectFieldNode: ObjectFieldNode = {
        ...objectFieldNodeRef.current!,
        value: {
          kind: 'ObjectValue',
          fields: [nextObjectFieldNode!],
        },
      };
      onEdit(objectFieldNodeRef.current, nextParentObjectFieldNode);
    },
    [objectFieldNodeRef, onEdit],
  );

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

      {isSelected && (
        <InputElement
          depth={depth}
          inputField={inputField}
          objectFieldNode={objectFieldNode}
          onEdit={onEditInputField}
        />
      )}

      {description && (
        <div className={classnames(styles.description, styles.indented)}>{description}</div>
      )}

      {(() => {
        if (isInputObjectType(unwrappedType) && isSelected) {
          const fields = unwrappedType.getFields();
          const objectFieldNodes: readonly ObjectFieldNode[] = (objectFieldNode!
            .value as ObjectValueNode)?.fields;
          return (
            <div className={classnames(styles.argumentFields)}>
              {Object.values(fields)
                .sort((a, b) => (a.name === 'id' ? -1 : a.name.localeCompare(b.name)))
                .map(field => (
                  <InputField
                    depth={depth + 1}
                    inputField={field}
                    key={field.name}
                    onEdit={onEditInputObjectField}
                    objectFieldNode={objectFieldNodes?.find(
                      ({ name }) => name.value === field.name,
                    )}
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
}

const Argument = React.memo(function Argument({
  argument,
  argumentNode,
  depth,
  onEdit,
}: ArgumentProps) {
  const { description, name, type } = argument;
  const isRequired = isRequiredArgument(argument);
  const argumentNodeRef = useRef(argumentNode);

  useEffect(() => {
    argumentNodeRef.current = argumentNode;
  }, [argumentNode]);

  const onEditArgument = (_prevValueNode?: ValueNode, nextValueNode?: ValueNode) => {
    const nextArgumentNode: ArgumentNode = {
      ...argumentNodeRef.current!,
      value: nextValueNode!,
    };
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

  const onToggleArgument = useCallback(() => {
    if (isRequired) {
      // Don't allow toggling of required argument
      return;
    }
    if (!argumentNodeRef.current) {
      const nextArgumentNode: ArgumentNode = generateArgumentSelectionFromType(argument);
      onEdit(argumentNodeRef.current, nextArgumentNode);
    } else {
      onEdit(argumentNodeRef.current, undefined);
    }
  }, [argument, argumentNodeRef, isRequired, onEdit]);

  const unwrappedType = unwrapType(type);
  const hasFields = isInputObjectType(unwrappedType);
  const isSelected = Boolean(argumentNode) || isRequired;

  return (
    <div className={classnames(styles.argument, styles.node, `depth-${depth}`)}>
      <label>
        {/* {hasFields ? (
          <span
            className={isSelected ? 'CodeMirror-foldgutter-open' : 'CodeMirror-foldgutter-folded'}
          />
        ) : (
          <span className={styles.spacer} />
        )} */}
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

        {/* <span className={classnames('cm-puncutation', styles.selectable)}>
          :{' '}
        </span> */}

        <TypeName className={styles.selectable} isInputType type={type} />
      </label>

      {(isScalarType(unwrappedType) || isEnumType(unwrappedType)) && isSelected && (
        <InputElement
          argument={argument}
          argumentNode={argumentNode}
          depth={depth}
          onEdit={onEditArgument}
        />
      )}

      {description && (
        <div className={classnames(styles.description, styles.indented)}>{description}</div>
      )}

      {(() => {
        if (isInputObjectType(unwrappedType) && isSelected) {
          const fields = unwrappedType.getFields();
          const objectFieldNodes: readonly ObjectFieldNode[] = (argumentNode!
            .value as ObjectValueNode)?.fields;
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
