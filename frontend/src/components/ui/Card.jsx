export default function Card({ title, value, icon, tone = 'tone-indigo', children }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        {icon && <div className={`stat-card-icon ${tone}`}>{icon}</div>}
      </div>
      {value !== undefined && <div className="stat-card-value">{value}</div>}
      {children}
    </div>
  );
}
