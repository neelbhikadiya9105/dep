export default function LoadingSpinner({ size = 'md', text }) {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <div className={`${sizeClass} border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin`} />
      {text && <span className="text-sm text-slate-500">{text}</span>}
    </div>
  );
}
