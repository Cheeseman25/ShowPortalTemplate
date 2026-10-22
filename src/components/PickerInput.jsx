// Date or time input with a visible, light icon drawn by us.
// The browser's own icon is hidden (see styles.css) but still opens the picker when clicked.

export function PickerInput({ kind, className = '', ...rest }) {
  const inputRef = React.useRef(null);
  // Clicking the icon opens the native picker: showPicker() where supported, otherwise a plain focus.
  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    if (typeof el.showPicker === 'function') {
      try { el.showPicker(); } catch (err) {}
    }
  };
  const icon = kind === 'time' ? (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
  return (
    <div className="relative">
      <input ref={inputRef} {...rest} className={`${className} pr-10`} />
      <button
        type="button"
        tabIndex={-1}
        onClick={openPicker}
        aria-label={kind === 'time' ? 'Open clock' : 'Open calendar'}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-300 hover:text-white cursor-pointer">
        {icon}
      </button>
    </div>
  );
}
