import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface AuthGuardProps {
  children: ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const [, navigate] = useLocation();
  
  const { data, isLoading } = useQuery({
    queryKey: ["/api/auth/session"],
    onError: () => {
      navigate("/login");
    },
  });

  // If we're loading the session, show a loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }

  // If we're not authenticated, redirect to login
  if (!data || !data.authenticated) {
    navigate("/login");
    return null;
  }

  // If we're authenticated, render the children
  return <>{children}</>;
};

export default AuthGuard;