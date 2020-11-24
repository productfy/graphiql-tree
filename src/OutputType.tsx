import classnames from 'classnames';
import {
  ArgumentNode,
  FieldNode,
  GraphQLField,
  GraphQLOutputType,
  isInterfaceType,
  isObjectType,
  SelectionSetNode,
} from 'graphql';
import React, { useCallback, useContext, useEffect, useRef } from 'react';

import { Argument } from './InputType';
import {
  generateOutputFieldSelectionFromType,
  mergeArgumentIntoSelection,
  mergeSelectionIntoSelectionSet,
  mergeSelectionSetIntoSelection,
  sourcesAreEqual,
  unwrapType,
} from './graphqlHelper';
import { SchemaContext } from './Context';
import TypeName from './TypeName';

import styles from './GraphiQLTree.module.scss';

export interface FieldProps {
  depth: number;
  field: GraphQLField<any, any>;
  onEdit: (prevSelectionNode?: FieldNode, nextSelectionNode?: FieldNode) => void;
  selectionNode?: FieldNode;
}

const Field = React.memo(function Field({ depth, field, onEdit, selectionNode }: FieldProps) {
  const selectionNodeRef = useRef(selectionNode);

  useEffect(() => {
    selectionNodeRef.current = selectionNode;
  }, [selectionNode]);

  const onEditArgument = useCallback(
    (prevArgumentNode?: ArgumentNode, nextArgumentNode?: ArgumentNode) => {
      const nextSelectionNode = mergeArgumentIntoSelection(
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
    if (depth === 4) {
      return;
    }
    if (!selectionNodeRef.current) {
      const nextFieldNode = generateOutputFieldSelectionFromType(field);
      onEdit(selectionNodeRef.current, nextFieldNode);
    } else {
      onEdit(selectionNodeRef.current, undefined);
    }
  }, [depth, field, onEdit, selectionNodeRef]);

  const { args, name, type } = field;
  const unwrappedType = unwrapType(type);
  const hasArgs = args.length > 0;
  const hasFields =
    isObjectType(unwrappedType) ||
    (isInterfaceType(unwrappedType) && Object.keys(unwrappedType.getFields()).length > 0);
  const isSelected = Boolean(selectionNode);

  return (
    <div className={classnames(styles.node, styles.fieldNode, `depth-${depth}`)}>
      <div
        className={classnames(styles.nameLine, {
          [styles.selectable]: depth !== 4,
        })}
        onClick={onToggleField}
      >
        {hasFields && depth !== 4 && (
          <>
            <span className={`CodeMirror-foldgutter-${isSelected ? 'open' : 'folded'}`} />
            <span className={styles.checkbox}>
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

        <span className="field-name">{name}</span>
        <TypeName type={type} />
        {/* {!selected && hasArgs && <span className="cm-punctuation">()</span>}
        {(!selected || !hasFields) && (
          <>
            <span className="cm-punctuation">: </span>
            <TypeName type={type} />
          </>
        )}
        {selected && hasArgs && <span className="cm-punctuation">(</span>}
        {selected && hasFields && !hasArgs && <span className="cm-punctuation">{' {'}</span>} */}
      </div>
      {field.description && (
        <div
          className={classnames(styles.description, {
            [styles.indented]: depth !== 4,
          })}
        >
          {field.description}
        </div>
      )}

      {isSelected && (
        <>
          {hasArgs && (
            <>
              <h5 className={styles.parameters}>Parameters</h5>

              <div className={styles.arguments}>
                {(args || [])
                  .sort((a, b) => (a.name === 'id' ? -1 : a.name.localeCompare(b.name)))
                  .map(arg => (
                    <Argument
                      argument={arg}
                      argumentNode={(selectionNode as FieldNode)?.arguments?.find(
                        argument => argument.name.value === arg.name,
                      )}
                      depth={depth + 1}
                      key={arg.name}
                      onEdit={onEditArgument}
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

          {hasFields && (
            <>
              {depth === 4 && <h5 className={styles.returns}>Returns</h5>}
              <Type
                depth={depth + 1}
                onEdit={onEditType}
                selectionSetNode={
                  (selectionNode as FieldNode)?.selectionSet || /*
                   * This will allow opening object fields without selecting any of its fields
                   */ {
                    kind: 'SelectionSet',
                    selections: [],
                  }
                }
                type={type}
              />
            </>
          )}

          {/* {hasFields && <div className="cm-punctuation">{'}'}</div>} */}
        </>
      )}
    </div>
  );
}, sourcesAreEqual('selectionNode'));

export interface TypeProps {
  depth: number;
  isImplementation?: boolean;
  onEdit: (prevSelectionSet?: SelectionSetNode, nextSelectionSet?: SelectionSetNode) => void;
  selectionSetNode: SelectionSetNode;
  type?: GraphQLOutputType | null;
}

const Type = React.memo(function Type({
  depth,
  isImplementation,
  onEdit,
  selectionSetNode,
  type,
}: TypeProps) {
  const schema = useContext(SchemaContext);
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
    (prevSelectionSetNode?: SelectionSetNode, nextSelectionSetNode?: SelectionSetNode) => {
      console.log(prevSelectionSetNode, nextSelectionSetNode);
    },
    [],
  );

  const onToggleType = useCallback(() => {
    if (!selectionSetNodeRef.current) {
      // TODO: Add required arguments nested fields
      const nextSelectionSet: SelectionSetNode = {
        kind: 'SelectionSet',
        selections: [],
      };
      onEdit(selectionSetNodeRef.current, nextSelectionSet);
    } else {
      onEdit(selectionSetNodeRef.current, undefined);
    }
  }, [onEdit, selectionSetNodeRef]);

  if (!type) {
    return null;
  }
  const isSelected = Boolean(selectionSetNode);
  const unwrappedType = unwrapType(type);
  if (isObjectType(unwrappedType)) {
    const fields = unwrappedType.getFields();
    return (
      <div className={classnames(styles.typeNode, `depth-${depth}`)}>
        {isImplementation && (
          <div className={classnames('type-name', styles.selectable)} onClick={onToggleType}>
            <span className={styles.checkbox}>
              <input
                checked={isSelected}
                onChange={onToggleType}
                type="checkbox"
                value={isSelected.toString()}
              />
            </span>
            {unwrappedType.name}
          </div>
        )}
        {isSelected && (
          <div className={depth > 6 ? styles.typeFields : undefined}>
            {Object.values(fields)
              .sort((a, b) => (a.name === 'id' ? -1 : a.name.localeCompare(b.name)))
              .map(field => {
                if (depth === 3 && field.name !== 'personAddress') {
                  return null;
                }
                const selection = (selectionSetNode?.selections as FieldNode[])?.find(
                  selection => selection.name?.value === field.name,
                );
                return (
                  <Field
                    depth={depth + 1}
                    key={field.name}
                    field={field}
                    onEdit={onEditField}
                    selectionNode={selection}
                  />
                );
              })}
          </div>
        )}
      </div>
    );
  }

  if (isInterfaceType(unwrappedType)) {
    const types = schema?.getPossibleTypes(unwrappedType) || [];
    const fields = unwrappedType.getFields();
    return (
      <div className={classnames(styles.typeNode, `depth-${depth}`)}>
        {Object.values(fields)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(field => (
            <Field depth={depth + 1} field={field} key={field.name} onEdit={onEditField} />
          ))}
        {types.map(type => (
          <Type
            depth={depth + 1}
            isImplementation
            key={type.name}
            onEdit={onEditType}
            selectionSetNode={selectionSetNode}
            type={type}
          />
        ))}
      </div>
    );
  }
  return <div>Unknown type</div>;
},
sourcesAreEqual('selectionSetNode'));

export { Field, Type };
