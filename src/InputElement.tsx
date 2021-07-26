import {
  BooleanValueNode,
  EnumValueNode,
  FloatValueNode,
  GraphQLInputType,
  IntValueNode,
  NullValueNode,
  StringValueNode,
  ValueNode,
  VariableDefinitionNode,
  VariableNode,
  isEnumType,
  parseType,
} from 'graphql';
import {
  NodeCustomizerContext,
  OperationDefinitionContext,
  VariableHandlerContext,
} from './Context';
import React, { ChangeEvent, useContext, useRef } from 'react';
import { sourcesAreEqual, unwrapType } from './graphqlHelper';

import Parent from './ParentDefinition';
import Tooltip from 'rc-tooltip';
import classnames from 'classnames';
import styles from './GraphiQLTree.module.scss';

export interface InputElementProps {
  className?: string;
  defaultValue: ValueNode;
  depth: number;
  isRequired?: boolean;
  name: string;
  onEdit: (prevValueNode?: ValueNode, nextValueNode?: ValueNode) => void;
  parent: Parent;
  type: GraphQLInputType;
  value?: ValueNode;
}

export default React.memo(function InputElement({
  defaultValue,
  depth,
  className,
  isRequired = false,
  name,
  onEdit,
  parent,
  type,
  value,
}: InputElementProps) {
  const operationDefinition = useContext(OperationDefinitionContext);
  const NodeCustomizer = useContext(NodeCustomizerContext);
  const variableHandler = useContext(VariableHandlerContext);
  const inputRef = useRef<HTMLInputElement>(null);
  const unwrappedType = unwrapType(type);
  const isVariable = value?.kind === 'Variable';

  const onEditInput = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const nextValue = e.target.value;
    let nextValueNode: ValueNode;
    let num: number;

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
          num = parseFloat(nextValue);
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
          if (nextValue === '') {
            nextValueNode = nullValueNode;
            break;
          }
          nextValueNode = {
            kind: 'IntValue',
            value: parseInt(nextValue).toString(),
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

  const onToggleParameter = () => {
    if (isVariable) {
      const prevVariableDefinition = operationDefinition?.variableDefinitions?.find(
        ({ variable }) => variable.name.value === name,
      );

      // This is a hack until we find a more elegant way of propagating changes for both
      // leaf (at any depth) and root. Right now we let the variableDefinition changes
      // finish and then make the changes to the argumentNode.
      variableHandler(prevVariableDefinition, undefined);
      setTimeout(() => onEdit(value, defaultValue), 50);
    } else {
      const variableNode: VariableNode = {
        kind: 'Variable',
        name: {
          kind: 'Name',
          value: name,
        },
      };
      const nextVariableDefinition: VariableDefinitionNode = {
        kind: 'VariableDefinition',
        variable: variableNode,
        type: parseType(type.toString()),
        directives: [],
      };

      variableHandler(undefined, nextVariableDefinition);
      setTimeout(() => onEdit(value, variableNode), 50);
    }
  };

  return (
    <div className={classnames(styles.argInput, className)}>
      {(() => {
        const customScalarArgumentResult = NodeCustomizer({
          depth,
          isRequired,
          name,
          onEdit,
          parent,
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
                    onKeyDown={e => {
                      if (
                        ['Int', 'Long'].includes(unwrappedType.name) &&
                        [',', '.'].includes(e.key)
                      ) {
                        e.preventDefault();
                      }
                    }}
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
              scalarValue = isVariable
                ? `$${(value as VariableNode).name.value}`
                : (value as NullValueNode)?.kind === 'NullValue'
                ? ''
                : (value as StringValueNode)?.value ?? '';
              return (
                <div className={styles.withParameterize}>
                  <Tooltip overlay="Parameterize" overlayClassName={styles.tooltip} placement="top">
                    <button
                      className={classnames(styles.parameterize, {
                        [styles.active]: isVariable,
                      })}
                      onClick={onToggleParameter}
                    >
                      $
                    </button>
                  </Tooltip>
                  {isVariable ? (
                    <div className="cm-variable">
                      <input
                        type="text"
                        value={scalarValue}
                        className={styles.inputText}
                        disabled
                      />
                    </div>
                  ) : (
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
                  )}
                </div>
              );
          }
        }
      })()}
    </div>
  );
},
sourcesAreEqual('value'));
