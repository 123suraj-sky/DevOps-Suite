import { useAuth } from '../../context/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import { UserDashboard } from './UserDashboard';

export const DashboardPage = () => {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <UserDashboard />;
};
