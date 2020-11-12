import classnames from 'classnames';
import {
  ArgumentNode,
  FieldNode,
  GraphQLField,
  GraphQLType,
  isInterfaceType,
  isObjectType,
  SelectionSetNode,
} from 'graphql';
import React, { useCallback, useContext, useEffect, useRef } from 'react';

import Argument from './Argument';
import {
  mergeArgumentIntoSelection,
  mergeSelectionIntoSelectionSet,
  mergeSelectionSetIntoSelection,
  sourcesAreEqual,
  unwrapType,
} from './graphqlHelper';
import { SchemaContext } from './Context';
import TypeName from './TypeName';

import styles from './GraphiQLExplorer.module.scss';

export interface FieldProps {
  depth: number;
  field: GraphQLField<any, any>;
  onEdit: (prevSelectionNode?: FieldNode, nextSelectionNode?: FieldNode) => void;
  selectionNode?: FieldNode;
}

const Field: React.FC<FieldProps> = React.memo(function Field({
  depth,
  field,
  onEdit,
  selectionNode,
}) {
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
    if (!selectionNodeRef.current) {
      const nextFieldNode: FieldNode = {
        kind: 'Field',
        name: {
          kind: 'Name',
          value: field.name,
        },
      };
      onEdit(selectionNodeRef.current, nextFieldNode);
    } else {
      onEdit(selectionNodeRef.current, undefined);
    }
  }, [field.name, onEdit, selectionNodeRef]);

  const { args, name, type } = field;
  const unwrappedType = unwrapType(type);
  const hasArgs = args.length > 0;
  const hasFields =
    isObjectType(unwrappedType) ||
    (isInterfaceType(unwrappedType) && Object.keys(unwrappedType.getFields()).length > 0);
  const selected = Boolean(selectionNode);

  return (
    <div className={classnames(styles.node, styles.fieldNode, `depth-${depth}`)}>
      <div className={classnames(styles.nameLine, styles.selectable)} onClick={onToggleField}>
        {hasFields &&
          (selected ? (
            <>
              <span className="CodeMirror-foldgutter-open" />
              <span className={styles.checkbox}>
                <input
                  checked={selected}
                  onChange={onToggleField}
                  type="checkbox"
                  value={selected.toString()}
                />
              </span>
            </>
          ) : (
            <span className="CodeMirror-foldgutter-folded" />
          ))}

        {!hasFields && (
          <span className={styles.checkbox}>
            <input
              checked={selected}
              onChange={onToggleField}
              type="checkbox"
              value={selected.toString()}
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
        <div className={classnames(styles.description, styles.indented)}>{field.description}</div>
      )}

      {selected && (
        <>
          {hasArgs && (
            <>
              <h5 className={styles.parameters}>Parameters</h5>

              <div className={styles.arguments}>
                {(args || []).map(arg => (
                  <Argument
                    arg={arg}
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

              <div className={styles.indented}>
                <Type
                  depth={depth + 1}
                  onEdit={onEditType}
                  selectionSetNode={(selectionNode as FieldNode)?.selectionSet!}
                  type={type}
                />
              </div>
            </>
          )}

          {hasFields && <div className="cm-punctuation">{'}'}</div>}
        </>
      )}
    </div>
  );
},
sourcesAreEqual('selectionNode'));

export interface TypeProps {
  depth: number;
  isImplementation?: boolean;
  onEdit: (prevSelectionSet?: SelectionSetNode, nextSelectionSet?: SelectionSetNode) => void;
  selectionSetNode: SelectionSetNode;
  type?: GraphQLType | null;
}

const Type: React.FC<TypeProps> = React.memo(function Type({
  depth,
  isImplementation,
  onEdit,
  selectionSetNode,
  type,
}) {
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
      // TODO: Add required arguments and
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
  const selected = Boolean(selectionSetNode);
  const unwrappedType = unwrapType(type);
  if (isObjectType(unwrappedType)) {
    const fields = unwrappedType.getFields();
    return (
      <div className={classnames(styles.typeNode, `depth-${depth}`)}>
        {isImplementation && (
          <div className={classnames('type-name', styles.selectable)} onClick={onToggleType}>
            <span className={styles.checkbox}>
              <input
                checked={selected}
                onChange={onToggleType}
                type="checkbox"
                value={selected.toString()}
              />
            </span>
            {unwrappedType.name}
          </div>
        )}
        {selected &&
          Object.values(fields).map(field => {
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
    );
  }

  if (isInterfaceType(unwrappedType)) {
    const types = schema?.getPossibleTypes(unwrappedType) || [];
    const fields = unwrappedType.getFields();
    return (
      <div className={classnames(styles.typeNode, `depth-${depth}`)}>
        {Object.values(fields).map(field => (
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
