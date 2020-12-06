import CodeMirror, { Editor } from 'codemirror';

import React from 'react';
import classnames from 'classnames';
import styles from './GraphiQLWithTree.module.scss';

interface CodeExportProps {
  code: string;
  mode: string;
  theme?: string;
}

export default class CodeExport extends React.PureComponent<CodeExportProps, {}> {
  _node?: HTMLDivElement;
  editor?: Editor;

  componentDidMount() {
    this.editor = CodeMirror(this._node!, {
      value: this.props.code.trim(),
      lineNumbers: false,
      mode: this.props.mode,
      readOnly: true,
      theme: this.props.theme,
    });
  }

  componentDidUpdate(prevProps: CodeExportProps) {
    if (this.props.code !== prevProps.code) {
      this.editor!.setValue(this.props.code);
    }
    if (this.props.mode !== prevProps.mode) {
      this.editor!.setOption('mode', this.props.mode);
    }
    if (this.props.theme !== prevProps.theme) {
      this.editor!.setOption('theme', this.props.theme);
    }
  }

  render() {
    return (
      <div
        className={classnames(styles.codeExport, 'codeExport')}
        ref={ref => (this._node = ref || undefined)}
      />
    );
  }
}
