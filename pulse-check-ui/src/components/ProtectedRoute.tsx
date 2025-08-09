// components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";

interface Props {
  children: JSX.Element;
}

export function ProtectedRoute({ children }: Props) {
  const token = localStorage.getItem("jwt_token");
  return token ? children : <Navigate to="/login" />;
}
