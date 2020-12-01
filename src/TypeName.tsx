import classnames from 'classnames';
import { GraphQLList, GraphQLNonNull, GraphQLType } from 'graphql';
import React from 'react';

import styles from './GraphiQLTree.module.scss';

type TypeNameProps = {
  className?: string;
  isInputType?: boolean;
  onClick?: () => void;
  type?: GraphQLType | null;
};

const TypeName = React.memo(function TypeName({
  className,
  isInputType = false,
  onClick,
  type,
}: TypeNameProps) {
  if (type instanceof GraphQLNonNull) {
    return (
      <span className={classnames(className, styles.typeName)} onClick={onClick}>
        <TypeName {...{ className, onClick, type: type.ofType }} />
        {isInputType && <span className={classnames(styles.required, styles.tag)}>Required</span>}
        {!isInputType && <span className={classnames(styles.tag, 'cm-keyword')}>Non-null</span>}
        {/* {!isInputType && <span className="cm-punctuation">{'!'}</span>} */}
      </span>
    );
  }
  if (type instanceof GraphQLList) {
    return (
      <span className={classnames(className, styles.typeName)} onClick={onClick}>
        <span className="cm-punctuation">{'['}</span>
        <TypeName {...{ className, onClick, type: type.ofType }} />
        <span className="cm-punctuation">{']'}</span>
      </span>
    );
  }
  return (
    <span className={classnames(className, styles.typeName, 'type-name')} onClick={onClick}>
      {type?.name}
    </span>
  );
});

export default TypeName;
