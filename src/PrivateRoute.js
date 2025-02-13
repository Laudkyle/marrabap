import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { refreshAccessToken } from "./components/auth";

const PrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("accessToken"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      const newToken = await refreshAccessToken();
      setIsAuthenticated(!!newToken);
      setLoading(false);
    };

    if (!isAuthenticated) {
      checkToken();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  if (loading) return <div>Loading...</div>; // Prevents blank screen

  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default PrivateRoute;
