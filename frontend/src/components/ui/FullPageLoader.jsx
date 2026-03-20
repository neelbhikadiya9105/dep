import LoadingSpinner from './LoadingSpinner.jsx';

export default function FullPageLoader({ text = 'Loading...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-base)' }}>
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
