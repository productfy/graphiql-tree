import classnames from 'classnames';
import {
  ArgumentNode,
  FloatValueNode,
  GraphQLArgument,
  GraphQLEnumType,
  IntValueNode,
  NullValueNode,
  StringValueNode,
  isInputObjectType,
  isNonNullType,
  BooleanValueNode,
} from 'graphql';
import React, { ChangeEvent, useCallback, useEffect, useRef } from 'react';

import { sourcesAreEqual, unwrapType } from './graphqlHelper';
import TypeName from './TypeName';

import styles from './GraphiQLExplorer.module.scss';

export interface ArgumentProps {
  arg: GraphQLArgument;
  argumentNode?: ArgumentNode;
  depth: number;
  onEdit: (prevArgumentNode?: ArgumentNode, nextArgumentNode?: ArgumentNode) => void;
}

export default React.memo(function Argument({
  arg: { description, name, type },
  argumentNode,
  depth,
  onEdit,
}: ArgumentProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const argumentNodeRef = useRef(argumentNode);

  useEffect(() => {
    argumentNodeRef.current = argumentNode;
  }, [argumentNode]);

  const onEditArgument = (e: ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    const nextValueNode: StringValueNode = {
      kind: 'StringValue',
      value: nextValue,
    };
    const nextArgumentNode: ArgumentNode = {
      ...argumentNodeRef.current!,
      value: nextValueNode,
    };
    onEdit(argumentNodeRef.current, nextArgumentNode);
  };

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

      <span className={classnames('cm-puncutation', styles.selectable)} onClick={onToggleArgument}>
        :{' '}
      </span>

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
                      />
                      <span>true</span>
                    </label>
                    <label>
                      <input
                        checked={booleanValue === false}
                        name={name}
                        onChange={onEditArgument}
                        type="radio"
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
                if (unwrappedType instanceof GraphQLEnumType) {
                  const options = unwrappedType.getValues();
                  return (
                    <div>
                      <select ref={selectRef}>
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
                break;
            }
            return null;
          })()}
        </div>
      )}

      {description && (
        <div className={classnames(styles.description, styles.indented)}>{description}</div>
      )}
    </div>
  );
},
sourcesAreEqual('argumentNode'));
