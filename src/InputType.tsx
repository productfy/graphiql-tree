import classnames from 'classnames';
import {
  ArgumentNode,
  BooleanValueNode,
  FieldNode,
  FloatValueNode,
  GraphQLArgument,
  GraphQLInputField,
  IntValueNode,
  NullValueNode,
  StringValueNode,
  isEnumType,
  isInputObjectType,
  isNonNullType,
  isScalarType,
} from 'graphql';
import React, { ChangeEvent, useCallback, useContext, useEffect, useRef } from 'react';

import { CustomNodeContext } from './Context';
import { sourcesAreEqual, unwrapType } from './graphqlHelper';
import TypeName from './TypeName';

import styles from './GraphiQLTree.module.scss';

export interface InputFieldProps {
  depth: number;
  field: GraphQLInputField;
  onEdit: (prevSelectionNode?: FieldNode, nextSelectionNode?: FieldNode) => void;
  selectionNode?: FieldNode;
}

const InputField = React.memo(function InputField({
  depth,
  field,
  onEdit,
  selectionNode,
}: InputFieldProps) {
  const { description, name, type } = field;
  return (
    <div className={styles.inputField}>
      <div>
        <span className={styles.checkbox}>
          <input
            // checked={selected}
            // disabled={isRequired}
            // onChange={onToggleArgument}
            type="checkbox"
            // value={selected.toString()}
          />
        </span>

        <span className={classnames('arg-name', styles.selectable)} onClick={() => {}}>
          {name}
        </span>

        <TypeName className={styles.selectable} onClick={() => {}} type={type} />
      </div>
      {description && (
        <div className={classnames(styles.description, styles.indented)}>{description}</div>
      )}
    </div>
  );
},
sourcesAreEqual('selectionNode'));

export interface ArgumentProps {
  arg: GraphQLArgument; // Schema
  argumentNode?: ArgumentNode; // Selection
  depth: number;
  onEdit: (prevArgumentNode?: ArgumentNode, nextArgumentNode?: ArgumentNode) => void;
}

const Argument = React.memo(function Argument({ arg, argumentNode, depth, onEdit }: ArgumentProps) {
  const { description, name, type } = arg;
  const customizeNode = useContext(CustomNodeContext);
  const inputRef = useRef<HTMLInputElement>(null);
  const argumentNodeRef = useRef(argumentNode);

  useEffect(() => {
    argumentNodeRef.current = argumentNode;
  }, [argumentNode]);

  const onEditArgument = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const nextValue = e.target.value;
    const unwrappedType = unwrapType(type);
    let nextValueNode;
    switch (unwrappedType.name) {
      case 'Boolean':
        if (['true', 'false'].includes(nextValue)) {
          nextValueNode = {
            kind: 'BooleanValue',
            value: nextValue === 'true',
          } as BooleanValueNode;
        } else {
          nextValueNode = {
            kind: 'NullValue',
          } as NullValueNode;
        }
        break;
      default:
        nextValueNode = {
          kind: 'StringValue',
          value: nextValue,
        } as StringValueNode;
    }
    const nextArgumentNode: ArgumentNode = {
      ...argumentNodeRef.current!,
      value: nextValueNode,
    };
    onEdit(argumentNodeRef.current, nextArgumentNode);
  };

  const onEditInputField = useCallback(() => {
    onEdit(argumentNodeRef.current, argumentNodeRef.current);
  }, [onEdit]);

  const onToggleArgument = useCallback(() => {
    if (isNonNullType(type)) {
      // Don't allow toggling of required argument
      return;
    }
    if (!argumentNodeRef.current) {
      const nextArgumentNode: ArgumentNode = {
        kind: 'Argument',
        name: {
          kind: 'Name',
          value: name,
        },
        value: {
          kind: 'StringValue',
          value: '',
        },
      };
      onEdit(argumentNodeRef.current, nextArgumentNode);
    } else {
      onEdit(argumentNodeRef.current, undefined);
    }
  }, [argumentNodeRef, onEdit, name, type]);

  const unwrappedType = unwrapType(type);
  const hasFields = isInputObjectType(unwrappedType);
  const isRequired = isNonNullType(type);
  const selected = Boolean(argumentNode) || isRequired;

  return (
    <div className={classnames(styles.argument, styles.node, `depth-${depth}`)}>
      {/* {hasFields ? (
        <span
          className={selected ? 'CodeMirror-foldgutter-open' : 'CodeMirror-foldgutter-folded'}
        />
      ) : (
        <span className={styles.spacer} />
      )} */}
      {hasFields && (
        <span
          className={classnames(
            styles.selectable,
            selected ? 'CodeMirror-foldgutter-open' : 'CodeMirror-foldgutter-folded',
          )}
          onClick={onToggleArgument}
        />
      )}

      <span className={styles.checkbox}>
        <input
          checked={selected}
          disabled={isRequired}
          onChange={onToggleArgument}
          type="checkbox"
          value={selected.toString()}
        />
      </span>

      <span className={classnames('arg-name', styles.selectable)} onClick={onToggleArgument}>
        {name}
      </span>

      {/* <span className={classnames('cm-puncutation', styles.selectable)} onClick={onToggleArgument}>
        :{' '}
      </span> */}

      <TypeName className={styles.selectable} onClick={onToggleArgument} type={type} />

      {selected && (
        <div className={classnames(styles.argInput, styles.indented)}>
          {(() => {
            switch (unwrappedType.name) {
              case 'Boolean':
                const booleanValue: boolean = (argumentNode?.value as BooleanValueNode)?.value;
                return (
                  <div className={classnames('cm-builtin', styles.boolean)}>
                    <label>
                      <input
                        checked={booleanValue === true}
                        name={name}
                        onChange={onEditArgument}
                        type="radio"
                        value="true"
                      />
                      <span>true</span>
                    </label>
                    <label>
                      <input
                        checked={booleanValue === false}
                        name={name}
                        onChange={onEditArgument}
                        type="radio"
                        value="false"
                      />
                      <span>false</span>
                    </label>
                  </div>
                );
              case 'Float':
              case 'Int':
              case 'ID':
              case 'String':
                let value: string | number | undefined =
                  (argumentNode?.value as FloatValueNode | IntValueNode | StringValueNode)?.value ??
                  '';
                if ((argumentNode?.value as NullValueNode)?.kind === 'NullValue') {
                  value = '';
                }
                return (
                  <div className="cm-string" onClick={() => inputRef.current?.focus()}>
                    <input
                      type="text"
                      ref={inputRef}
                      value={value}
                      onChange={onEditArgument}
                      className={classnames(styles.inputText, {
                        [styles.focusBorder]: String(value ?? '').length === 0,
                      })}
                      // style={{ width: `calc(1px + ${String(value ?? '').length}ch)` }}
                    />
                  </div>
                );
              default:
                if (isEnumType(unwrappedType)) {
                  const options = unwrappedType.getValues();
                  return (
                    <div className={classnames('cm-string', styles.select)}>
                      <select onChange={onEditArgument}>
                        <option
                          value=""
                          disabled={isRequired}
                          selected
                          hidden={isRequired}
                        ></option>
                        {options.map(({ name, value }) => (
                          <option key={value} value={value}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }
                if (isScalarType(unwrappedType)) {
                  const customScalarArgumentResult = customizeNode({
                    arg,
                    argumentNode,
                    depth,
                    onEditArgument,
                  });
                  if (customScalarArgumentResult) {
                    return customScalarArgumentResult;
                  }

                  let value: string | undefined =
                    (argumentNode?.value as StringValueNode)?.value ?? '';
                  if ((argumentNode?.value as NullValueNode)?.kind === 'NullValue') {
                    value = '';
                  }
                  return (
                    <div className="cm-string" onClick={() => inputRef.current?.focus()}>
                      <input
                        type="text"
                        ref={inputRef}
                        value={value}
                        onChange={onEditArgument}
                        className={classnames(styles.inputText, {
                          [styles.focusBorder]: String(value ?? '').length === 0,
                        })}
                        // style={{ width: `calc(1px + ${String(value ?? '').length}ch)` }}
                      />
                    </div>
                  );
                }
                break;
            }
            return null;
          })()}
        </div>
      )}

      {description && (
        <div className={classnames(styles.description, styles.indented)}>{description}</div>
      )}

      {(() => {
        if (isInputObjectType(unwrappedType) && selected) {
          const fields = unwrappedType.getFields();
          return (
            <div className={classnames(styles.argumentFields)}>
              {Object.values(fields).map(field => (
                <InputField
                  depth={depth + 1}
                  field={field}
                  key={field.name}
                  onEdit={onEditInputField}
                />
              ))}
            </div>
          );
        }
      })()}
    </div>
  );
}, sourcesAreEqual('argumentNode'));

export { Argument };
