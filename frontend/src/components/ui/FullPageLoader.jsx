import LoadingSpinner from './LoadingSpinner.jsx';

export default function FullPageLoader({ text = 'Loading...' }) {
  return (
    <div className="full-page-loader">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
