import CodeMirror, { Editor } from 'codemirror';
import React, { useLayoutEffect, useRef, useState } from 'react';

import type { RefObject } from 'react';
import classnames from 'classnames';
import styles from './GraphiQLWithTree.module.scss';
import useResizeObserver from '@react-hook/resize-observer';

interface CodeExportProps {
  code: string;
  height: number;
  mode: string;
  theme?: string;
}

class CodeExportContent extends React.PureComponent<CodeExportProps, {}> {
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
    const { height } = this.props;
    return (
      <div
        className={classnames(styles.codeExport, 'codeExport')}
        ref={ref => (this._node = ref || undefined)}
        style={{ height: Math.max(height - 34, 0) }}
      />
    );
  }
}

const useSize = (target: RefObject<HTMLElement>) => {
  const [size, setSize] = useState<DOMRect>();

  useLayoutEffect(() => {
    setSize(target.current?.getBoundingClientRect());
  }, [target]);

  // Where the magic happens
  useResizeObserver(target, (entry: any) => setSize(entry.contentRect));
  return size;
};

const CodeExport = (props: Omit<CodeExportProps, 'height'>) => {
  const target = useRef<HTMLElement>(
    document.getElementsByClassName('query-editor')[0] as HTMLElement,
  );
  const size: any = useSize(target);
  return <CodeExportContent {...props} height={size?.height || 0} />;
};

export default CodeExport;
