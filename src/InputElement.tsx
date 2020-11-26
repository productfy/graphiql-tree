import classnames from 'classnames';
import {
  ArgumentNode,
  BooleanValueNode,
  EnumValueNode,
  FloatValueNode,
  GraphQLArgument,
  GraphQLInputField,
  IntValueNode,
  NullValueNode,
  ObjectFieldNode,
  StringValueNode,
  ValueNode,
  isEnumType,
  isRequiredArgument,
  isRequiredInputField,
} from 'graphql';
import React, { ChangeEvent, useContext, useRef } from 'react';

import { CustomNodeContext } from './Context';
import { unwrapType } from './graphqlHelper';

import styles from './GraphiQLTree.module.scss';

export interface InputElementProps {
  argument?: GraphQLArgument;
  argumentNode?: ArgumentNode;
  inputField?: GraphQLInputField;
  depth: number;
  objectFieldNode?: ObjectFieldNode;
  onEdit: (prevValueNode?: ValueNode, nextValueNode?: ValueNode) => void;
}

export default React.memo(function InputElement({
  argument,
  argumentNode,
  depth,
  inputField,
  objectFieldNode,
  onEdit,
}: InputElementProps) {
  const customizeNode = useContext(CustomNodeContext);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!argument && !inputField) {
    // Shouldn't get to this point, but just in case
    return null;
  }

  const isRequired =
    (argument && isRequiredArgument(argument)) || (inputField && isRequiredInputField(inputField));
  const { name, type } = argument || inputField!;
  const value = argumentNode?.value || objectFieldNode?.value;
  const unwrappedType = unwrapType(type);

  const onEditInput = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const nextValue = e.target.value;
    let nextValueNode;

    if (isEnumType(unwrappedType)) {
      nextValueNode = {
        kind: 'EnumValue',
        value: nextValue,
      } as EnumValueNode;
    } else {
      // Scalars
      switch (unwrappedType.name) {
        case 'BigDecimal':
          nextValueNode = {
            kind: 'FloatValue',
            value: nextValue,
          } as FloatValueNode;
          break;
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
    }

    onEdit(value, nextValueNode);
  };

  return (
    <div className={classnames(styles.argInput, styles.indented)}>
      {(() => {
        if (isEnumType(unwrappedType)) {
          const options = unwrappedType.getValues();
          return (
            <div className={classnames('cm-string', styles.select)}>
              <select onChange={onEditInput} value={(value as EnumValueNode).value || ''}>
                <option value="" disabled={isRequired} hidden={isRequired}></option>
                {options.map(({ name, value }) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          );
        } else {
          // Scalars
          let scalarValue: string | number | undefined;
          switch (unwrappedType.name) {
            case 'Boolean':
              const booleanValue: boolean = (value as BooleanValueNode)?.value;
              return (
                <div className={classnames('cm-builtin', styles.boolean)}>
                  <label>
                    <input
                      checked={booleanValue === true}
                      name={name}
                      onChange={onEditInput}
                      type="radio"
                      value="true"
                    />
                    <span>true</span>
                  </label>
                  <label>
                    <input
                      checked={booleanValue === false}
                      name={name}
                      onChange={onEditInput}
                      type="radio"
                      value="false"
                    />
                    <span>false</span>
                  </label>
                </div>
              );
            case 'BigDecimal':
            case 'Float':
            case 'ID':
            case 'Int':
            case 'String':
              scalarValue =
                (value as NullValueNode)?.kind === 'NullValue'
                  ? ''
                  : (value as FloatValueNode | IntValueNode | StringValueNode)?.value ?? '';
              return (
                <div className="cm-string" onClick={() => inputRef.current?.focus()}>
                  <input
                    type="text"
                    ref={inputRef}
                    value={scalarValue}
                    onChange={onEditInput}
                    className={classnames(styles.inputText, {
                      [styles.focusBorder]: String(value ?? '').length === 0,
                    })}
                    // style={{ width: `calc(1px + ${String(value ?? '').length}ch)` }}
                  />
                </div>
              );
            default:
              const customScalarArgumentResult = customizeNode({
                argument,
                argumentNode,
                depth,
                inputField,
                objectFieldNode,
                onEdit,
              });
              if (customScalarArgumentResult) {
                return customScalarArgumentResult;
              }

              scalarValue = (value as StringValueNode)?.value ?? '';
              if ((value as NullValueNode)?.kind === 'NullValue') {
                scalarValue = '';
              }
              return (
                <div className="cm-string" onClick={() => inputRef.current?.focus()}>
                  <input
                    type="text"
                    ref={inputRef}
                    value={scalarValue}
                    onChange={onEditInput}
                    className={classnames(styles.inputText, {
                      [styles.focusBorder]: String(value ?? '').length === 0,
                    })}
                    // style={{ width: `calc(1px + ${String(value ?? '').length}ch)` }}
                  />
                </div>
              );
          }
        }
      })()}
    </div>
  );
});
