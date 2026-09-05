import React from 'react';
import './Skeleton.scss';

export default function Skeleton({
  variant = 'text',
  count = 1,
  width,
  height,
  className = '',
  style = {},
}) {
  const elements = Array.from({ length: Math.max(1, count) }, (_, i) => i);

  return (
    <>
      {elements.map((key) => (
        <div
          key={key}
          className={`ui-skeleton ui-skeleton--${variant} ${className}`}
          style={{
            ...(width ? { width } : {}),
            ...(height ? { height } : {}),
            ...style,
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}
