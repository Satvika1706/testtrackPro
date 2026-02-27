import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUser, type AppRole } from "../utils/auth";

interface RoleGuardProps {
  allowedRoles: AppRole[];
  redirectTo: string;
  children: ReactElement;
}

const RoleGuard = ({ allowedRoles, redirectTo, children }: RoleGuardProps) => {
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default RoleGuard;
