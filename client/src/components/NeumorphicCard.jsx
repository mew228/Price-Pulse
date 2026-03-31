import React from 'react';

export default function NeumorphicCard({ children, className = '', inset = false, style = {} }) {
  return (
    <div
      className={`${inset ? 'nm-card-inset' : 'nm-card'} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
