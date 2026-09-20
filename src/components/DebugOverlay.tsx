import React, { useEffect, useRef, useState } from 'react';

// TEMPORARY debug tool - shows console.log/warn/error output in an on-screen
// panel so we can see logs directly on a mobile device without needing
// USB debugging / chrome://inspect. Safe to delete once the bug is found.
const DebugOverlay: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const originalLog = useRef(console.log);
  const originalWarn = useRef(console.warn);
  const originalError = useRef(console.error);

  useEffect(() => {
    const format = (args: any[]) =>
      args
        .map((a) => {
          try {
            return typeof a === 'object' ? JSON.stringify(a) : String(a);
          } catch {
            return String(a);
          }
        })
        .join(' ');

    const makePush = (prefix: string) => (...args: any[]) => {
      const line = `${new Date().toLocaleTimeString()} ${prefix} ${format(args)}`;
      setLogs((prev) => [...prev.slice(-59), line]);
    };

    const pushLog = makePush('[LOG]');
    const pushWarn = makePush('[WARN]');
    const pushError = makePush('[ERR]');

    window.onerror = (message, source, lineno, colno, error) => {
      pushError(`UNCAUGHT: ${message} at ${lineno}:${colno} ${error?.stack || ''}`);
      return false;
    };
    window.onunhandledrejection = (event) => {
      pushError(`UNHANDLED PROMISE REJECTION: ${event.reason}`);
    };

    console.log = (...args: any[]) => {
      originalLog.current(...args);
      pushLog(...args);
    };
    console.warn = (...args: any[]) => {
      originalWarn.current(...args);
      pushWarn(...args);
    };
    console.error = (...args: any[]) => {
      originalError.current(...args);
      pushError(...args);
    };

    return () => {
      console.log = originalLog.current;
      console.warn = originalWarn.current;
      console.error = originalError.current;
    };
  }, []);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          zIndex: 999999,
          background: '#111',
          color: '#0f0',
          border: '1px solid #0f0',
          borderRadius: 8,
          padding: '8px 12px',
          fontSize: 12,
          fontFamily: 'monospace',
        }}
      >
        Logs ({logs.length})
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '45vh',
        background: 'rgba(0,0,0,0.95)',
        color: '#0f0',
        fontSize: 10,
        fontFamily: 'monospace',
        overflowY: 'auto',
        zIndex: 999999,
        padding: 8,
        borderTop: '2px solid #0f0',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 6,
          position: 'sticky',
          top: 0,
          background: 'rgba(0,0,0,0.95)',
          paddingBottom: 4,
        }}
      >
        <strong>Debug Console ({logs.length})</strong>
        <div>
          <button
            onClick={() => setLogs([])}
            style={{ marginRight: 8, background: '#222', color: '#0f0', border: '1px solid #0f0', padding: '2px 8px' }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: '#222', color: '#f55', border: '1px solid #f55', padding: '2px 8px' }}
          >
            Close
          </button>
        </div>
      </div>
      {logs.length === 0 && <div style={{ color: '#666' }}>No logs yet. Try speaking or typing a query.</div>}
      {logs.map((l, i) => (
        <div key={i} style={{ borderBottom: '1px solid #222', padding: '3px 0', wordBreak: 'break-all' }}>
          {l}
        </div>
      ))}
    </div>
  );
};

export default DebugOverlay;
