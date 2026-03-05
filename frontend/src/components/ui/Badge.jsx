const VARIANTS = {
  success: 'badge-success',
  danger:  'badge-danger',
  warning: 'badge-warning',
  info:    'badge-info',
  gray:    'badge-gray',
  owner:   'badge-owner',
  manager: 'badge-manager',
  staff:   'badge-staff',
};

export default function Badge({ children, variant = 'gray' }) {
  return (
    <span className={`badge ${VARIANTS[variant] || 'badge-gray'}`}>
      {children}
    </span>
  );
}

export function RoleBadge({ role }) {
  const variant = role === 'owner' ? 'owner' : role === 'manager' ? 'manager' : 'staff';
  return <Badge variant={variant}>{role}</Badge>;
}
