import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface AuthGuardProps {
  children: ReactNode;
}

interface SessionData {
  authenticated: boolean;
  user?: {
    id: number;
    username: string;
    name: string;
    role: string;
  };
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const [location, navigate] = useLocation();
  
  const { data, isLoading, error } = useQuery<SessionData>({
    queryKey: ["/api/auth/session"],
    retry: false,
    staleTime: 0, // Don't use stale data
    refetchOnMount: true, // Always refetch on component mount
  });

  useEffect(() => {
    // Only redirect if we have a response and user is not authenticated
    if (!isLoading && (!data?.authenticated || error)) {
      if (location !== "/login") {
        // Prevent infinite redirect loops - only navigate if we're not already at login
        console.log("No authentication detected, redirecting to login");
        navigate("/login");
      }
    }
  }, [data, isLoading, error, navigate, location]);

  // If we're loading the session, show a loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
      </div>
    );
  }

  // If we're not authenticated, show nothing (redirect will happen in useEffect)
  if (!data?.authenticated) {
    return null;
  }

  // If we're authenticated, render the children
  return <>{children}</>;
};

export default AuthGuard;