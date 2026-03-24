import { Link } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';

export default function ForbiddenPage() {
  return (
    <div className="forbidden-page">
      <div className="forbidden-card">
        <div className="forbidden-icon-wrap">
          <FiLock className="forbidden-icon" size={36} />
        </div>
        <h1 className="forbidden-code">403</h1>
        <h2 className="forbidden-title">Access Forbidden</h2>
        <p className="forbidden-copy">
          You don&apos;t have permission to access this page. Please contact your administrator if you believe this is an error.
        </p>
        <Link to="/dashboard" className="btn btn-primary forbidden-link">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
