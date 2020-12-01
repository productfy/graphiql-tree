import classnames from 'classnames';
import {
  BooleanValueNode,
  EnumValueNode,
  FloatValueNode,
  GraphQLInputType,
  IntValueNode,
  NullValueNode,
  StringValueNode,
  ValueNode,
  isEnumType,
} from 'graphql';
import React, { ChangeEvent, useContext, useRef } from 'react';

import { NodeCustomizerContext } from './Context';
import ParentDefinition from './ParentDefinition';
import { sourcesAreEqual, unwrapType } from './graphqlHelper';

import styles from './GraphiQLTree.module.scss';

export interface InputElementProps {
  depth: number;
  isRequired?: boolean;
  name: string;
  onEdit: (prevValueNode?: ValueNode, nextValueNode?: ValueNode) => void;
  parentDefinition: ParentDefinition;
  type: GraphQLInputType;
  value?: ValueNode;
}

export default React.memo(function InputElement({
  depth,
  isRequired = false,
  name,
  onEdit,
  parentDefinition,
  type,
  value,
}: InputElementProps) {
  const NodeCustomizer = useContext(NodeCustomizerContext);
  const inputRef = useRef<HTMLInputElement>(null);
  const unwrappedType = unwrapType(type);

  const onEditInput = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const nextValue = e.target.value;
    let nextValueNode: ValueNode;

    const nullValueNode: NullValueNode = { kind: 'NullValue' };

    if (isEnumType(unwrappedType)) {
      nextValueNode = {
        kind: 'EnumValue',
        value: nextValue,
      } as EnumValueNode;
    } else {
      // Scalars
      switch (unwrappedType.name) {
        case 'BigDecimal':
        case 'Float':
          if (nextValue === '') {
            nextValueNode = nullValueNode;
            break;
          }
          const num = parseFloat(nextValue);
          if (isNaN(num)) {
            nextValueNode = {
              kind: 'StringValue',
              value: nextValue,
            } as StringValueNode;
          } else {
            nextValueNode = {
              kind: 'FloatValue',
              value: num.toString(),
            } as FloatValueNode;
          }
          break;
        case 'Long':
        case 'Int':
          nextValueNode = {
            kind: 'IntValue',
            value: nextValue,
          } as IntValueNode;
          break;
        case 'Boolean':
          if (['true', 'false'].includes(nextValue)) {
            nextValueNode = {
              kind: 'BooleanValue',
              value: nextValue === 'true',
            } as BooleanValueNode;
          } else {
            nextValueNode = nullValueNode;
          }
          break;
        case 'OffsetDateTime':
          nextValueNode = {
            kind: 'StringValue',
            value: `${nextValue}Z`,
          } as StringValueNode;
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
        const customScalarArgumentResult = NodeCustomizer({
          depth,
          isRequired,
          name,
          onEdit,
          parentDefinition,
          type,
          value,
        });
        if (customScalarArgumentResult) {
          return customScalarArgumentResult;
        }

        if (isEnumType(unwrappedType)) {
          const options = unwrappedType.getValues();
          return (
            <div className={classnames('cm-string-2', styles.select)}>
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
                      onChange={onEditInput}
                      type="radio"
                      value="true"
                    />
                    <span>true</span>
                  </label>
                  <label>
                    <input
                      checked={booleanValue === false}
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
            case 'Int':
            case 'Long':
              scalarValue =
                (value as NullValueNode)?.kind === 'NullValue'
                  ? ''
                  : (value as FloatValueNode | IntValueNode)?.value ?? '';
              return (
                <div className="cm-number" onClick={() => inputRef.current?.focus()}>
                  <input
                    type="number"
                    ref={inputRef}
                    value={scalarValue}
                    onChange={onEditInput}
                    className={styles.inputText}
                    // style={{ width: `calc(1px + ${String(value ?? '').length}ch)` }}
                  />
                </div>
              );
            case 'LocalDate':
              scalarValue =
                (value as NullValueNode)?.kind === 'NullValue'
                  ? ''
                  : (value as StringValueNode)?.value ?? '';
              return (
                <div className="cm-string" onClick={() => inputRef.current?.focus()}>
                  <input
                    type="date"
                    ref={inputRef}
                    value={scalarValue}
                    onChange={onEditInput}
                    className={styles.inputText}
                    // style={{ width: `calc(1px + ${String(value ?? '').length}ch)` }}
                  />
                </div>
              );
            case 'OffsetDateTime':
              scalarValue =
                (value as NullValueNode)?.kind === 'NullValue'
                  ? ''
                  : (value as StringValueNode)?.value ?? '';
              return (
                <div className="cm-string" onClick={() => inputRef.current?.focus()}>
                  <input
                    type="datetime-local"
                    ref={inputRef}
                    value={scalarValue.slice(0, 16)}
                    onChange={onEditInput}
                    pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}"
                    className={styles.inputText}
                    // style={{ width: `calc(1px + ${String(value ?? '').length}ch)` }}
                  />
                </div>
              );
            default:
              scalarValue =
                (value as NullValueNode)?.kind === 'NullValue'
                  ? ''
                  : (value as StringValueNode)?.value ?? '';
              return (
                <div className="cm-string" onClick={() => inputRef.current?.focus()}>
                  <input
                    type="text"
                    ref={inputRef}
                    value={scalarValue}
                    onChange={onEditInput}
                    className={styles.inputText}
                    // style={{ width: `calc(1px + ${String(value ?? '').length}ch)` }}
                  />
                </div>
              );
          }
        }
      })()}
    </div>
  );
},
sourcesAreEqual('value'));
