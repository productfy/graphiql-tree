import React from 'react';

const Clipboard = ({
  className,
  onClick,
  title,
}: {
  className?: string;
  onClick?: React.MouseEventHandler<SVGElement>;
  title?: string;
}) => (
  <svg
    className={className}
    {...(title ? { 'aria-labelledby': 'clipboardTitle' } : {})}
    height="16"
    onClick={onClick}
    viewBox="0 0 16 16"
    width="16"
    xmlns="http://www.w3.org/2000/svg"
  >
    {title && <title id="clipboardTitle">{title}</title>}
    <path
      d="M7 5h2a3 3 0 0 0 3-3 2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 3 3 0 0 0 3 3zM6 2a2 2 0 1 1 4 0 1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z"
      fillRule="evenodd"
    ></path>
  </svg>
);

export default Clipboard;
