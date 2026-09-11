import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { homePath, isAdmin } from '../utils/auth';

const AdminGuard: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);

  if (!isAdmin(user)) {
    return <Navigate to={homePath(user)} replace />;
  }

  return <Outlet />;
};

export default AdminGuard;
