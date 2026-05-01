import React, { useState, useEffect, useRef } from 'react';
import { useModalStore } from '../modalStore';
import { X, AlertCircle, HelpCircle, MessageSquare } from 'lucide-react';

const GlobalModal: React.FC = () => {
  const { 
    isOpen, type, title, message, defaultValue, confirmLabel, cancelLabel, onConfirm, onCancel, close 
  } = useModalStore();

  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue || '');
      if (type === 'prompt') {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [isOpen, defaultValue, type]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'alert': return <AlertCircle size={48} color="var(--accent)" />;
      case 'confirm': return <HelpCircle size={48} color="var(--accent)" />;
      case 'prompt': return <MessageSquare size={48} color="var(--accent)" />;
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onCancel} style={{ zIndex: 100000 }}>
      <div 
        className="modal-content fade-in" 
        onMouseDown={e => e.stopPropagation()}
        style={{ 
          minWidth: '400px', 
          maxWidth: '500px',
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '20px'
        }}
      >
        <div style={{ position: 'absolute', top: '20px', right: '20px', cursor: 'pointer', color: 'var(--text-muted)' }} onClick={onCancel}>
          <X size={20} />
        </div>

        <div style={{ marginBottom: '10px' }}>
          {getIcon()}
        </div>

        <div style={{ width: '100%' }}>
          <h2 style={{ margin: '0 0 10px 0', color: 'var(--text-bright)', fontSize: '22px' }}>{title}</h2>
          <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '15px', lineHeight: '1.5' }}>{message}</p>
        </div>

        {type === 'prompt' && (
          <input 
            ref={inputRef}
            type="text" 
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: 'var(--bg-active)',
              border: '2px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-bright)',
              fontSize: '15px',
              marginTop: '10px'
            }}
          />
        )}

        <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '10px' }}>
          {type !== 'alert' && (
            <button 
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: 'transparent',
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--text-main)',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {cancelLabel}
            </button>
          )}
          <button 
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: 'var(--accent)',
              border: 'none',
              borderRadius: 'var(--radius)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalModal;
