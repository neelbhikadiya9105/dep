export default function LoadingSpinner({ size = 'md', text }) {
  const sizeClass = size === 'sm' ? 'size-sm' : size === 'lg' ? 'size-lg' : 'size-md';

  return (
    <div className="loading-spinner-wrap">
      <div className={`loading-spinner ${sizeClass} tone-indigo`} />
      {text && <span className="loading-spinner-text">{text}</span>}
    </div>
  );
}
