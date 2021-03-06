import React from 'react';

const Trash = ({ className, title }: { className?: string; title?: string }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width=".79em"
    height="1em"
    aria-hidden="true"
    {...(title ? { 'aria-labelledby': 'trashTitle' } : {})}
    style={{ msTransform: 'rotate(360deg)' }}
    transform="rotate(360)"
    viewBox="0 0 832 1056"
  >
    {title && <title id="trashTitle">{title}</title>}
    <path
      fill="#626262"
      d="M801 175H576V88q0-20-10-37t-27-26.5-37-9.5H330q-30 0-52 21t-22 52v87H31q-13 0-22.5 9.5T-1 207t9.5 22.5T31 239h44l74 740q3 26 22.5 44t45.5 18h398q26 0 45.5-18t21.5-44l75-740h44q8 0 15.5-4.5t12-11.5 4.5-16q0-13-9.5-22.5T801 175zM320 88q0-10 10-10h172q10 0 10 10v87H320V88zm299 885q-1 4-4 4H217q-3 0-4-4l-73-734h552z"
    ></path>
  </svg>
);

export default Trash;
