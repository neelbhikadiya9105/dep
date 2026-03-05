export default function Card({ title, value, icon, colorClass = 'text-indigo-600', bgClass = 'bg-indigo-50', children }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{title}</span>
        {icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bgClass}`}>
            <span className={colorClass}>{icon}</span>
          </div>
        )}
      </div>
      {value !== undefined && (
        <div className="text-2xl font-bold text-slate-800">{value}</div>
      )}
      {children}
    </div>
  );
}
