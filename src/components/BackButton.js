import React from 'react';
import { ArrowLeft } from 'lucide-react';

const BackButton = ({ onClick, style }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px',
      borderRadius: '10px',
      backgroundColor: 'white',
      border: '1.5px solid #e2e8f0',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
      ...style
    }}
    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; }}
  >
    <ArrowLeft size={16} color="#0B1E3F" />
  </button>
);

export default BackButton;
