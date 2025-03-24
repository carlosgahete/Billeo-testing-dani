import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const LoginPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create a demo user if one doesn't exist yet
      if (username === "demo" && password === "demo") {
        try {
          // Try to register the demo user first (will fail if it already exists, which is fine)
          await apiRequest("/api/users", "POST", {
            name: "Demo User",
            username: "demo",
            password: "demo",
            email: "demo@example.com",
            role: "admin"
          });
        } catch (error) {
          // Ignore error if user already exists
          console.log("Demo user might already exist");
        }
      }

      // Attempt to login
      const response = await apiRequest("/api/auth/login", "POST", { 
        username, 
        password 
      });

      if (response) {
        toast({
          title: "Login successful",
          description: "Welcome to the financial management system",
        });
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            Billeo
          </CardTitle>
          <p className="text-sm text-neutral-500">
            Enter your credentials to access your account
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="demo"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="demo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
            <div className="text-center text-sm">
              <p className="text-neutral-500 mt-2">
                Demo account: username <span className="font-semibold">demo</span> / password <span className="font-semibold">demo</span>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;