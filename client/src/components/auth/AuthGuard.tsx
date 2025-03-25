import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: ReactNode;
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const [location, navigate] = useLocation();
  const { user, isLoading, error } = useAuth();

  useEffect(() => {
    // Only redirect if we have a response and user is not authenticated
    if (!isLoading && (!user || error)) {
      if (location !== "/auth") {
        // Prevent infinite redirect loops - only navigate if we're not already at auth
        console.log("No authentication detected, redirecting to auth page");
        navigate("/auth");
      }
    }
  }, [user, isLoading, error, navigate, location]);

  // If we're loading the session, show a loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If we're not authenticated, show nothing (redirect will happen in useEffect)
  if (!user) {
    return null;
  }

  // If we're authenticated, render the children
  return <>{children}</>;
};

export default AuthGuard;