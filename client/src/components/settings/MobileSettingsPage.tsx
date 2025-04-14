import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useLocation } from "wouter";
import { 
  ChevronLeft, 
  User, 
  Settings, 
  Moon, 
  Sun, 
  Bell, 
  Lock, 
  LogOut, 
  ChevronRight,
  Shield,
  Mail,
  UserCircle,
  Camera
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import FileUpload from "@/components/common/FileUpload";

interface UserSession {
  authenticated: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
    role: string;
    profileImage?: string | null;
  };
}

const MobileSettingsPage = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { refreshUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<string>("general");
  
  // Estados para configuraciones
  const [isDarkModeEnabled, setIsDarkModeEnabled] = useState(theme === "dark");
  const [isEmailNotificationsEnabled, setIsEmailNotificationsEnabled] = useState(true);
  
  // Estados para el formulario de perfil
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  
  // Estados para el formulario de contraseña
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  // Obtener datos del usuario
  const { data: sessionData, isLoading: userLoading } = useQuery<UserSession>({
    queryKey: ["/api/auth/session"],
  });
  
  const user = sessionData?.user;
  
  // Cargar datos del usuario cuando estén disponibles
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      if (user.profileImage) {
        setProfileImage(user.profileImage);
      }
    }
  }, [user]);
  
  // Escuchar cambios en el tema global
  useEffect(() => {
    setIsDarkModeEnabled(theme === "dark");
  }, [theme]);
  
  // Mutación para actualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuario no autenticado");
      
      setIsUpdatingProfile(true);
      
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          profileImage
        }),
      });
      
      if (!response.ok) {
        throw new Error("Error al actualizar perfil");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Perfil actualizado",
        description: "Tu información de perfil ha sido actualizada correctamente.",
      });
      refreshUser();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Ha ocurrido un error al actualizar el perfil",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUpdatingProfile(false);
    }
  });
  
  // Mutación para actualizar contraseña
  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuario no autenticado");
      
      if (newPassword !== confirmPassword) {
        throw new Error("Las contraseñas no coinciden");
      }
      
      setIsUpdatingPassword(true);
      
      const response = await fetch(`/api/users/${user.id}/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Error al actualizar contraseña");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada correctamente.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Ha ocurrido un error al actualizar la contraseña",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUpdatingPassword(false);
    }
  });
  
  // Manejar cambio de tema
  const handleThemeChange = (checked: boolean) => {
    setIsDarkModeEnabled(checked);
    setTheme(checked ? "dark" : "light");
  };
  
  // Manejar cierre de sesión
  const handleLogout = async () => {
    try {
      // Solicitud para cerrar sesión en el servidor
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      // Actualizar el estado de autenticación
      refreshUser();
      
      // Redirigir a la página de inicio de sesión
      navigate("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      toast({
        title: "Error",
        description: "Hubo un problema al cerrar la sesión. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };
  
  // Manejar carga de imagen de perfil
  const handleProfileImageUpload = (path: string) => {
    setProfileImage(path);
  };
  
  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Renderizar sección de perfil general
  const renderGeneralSection = () => (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-5 py-3">
        <h2 className="text-lg font-medium text-gray-800">Información personal</h2>
      </div>
      
      {/* Avatar */}
      <div className="bg-gradient-to-br from-blue-50 to-white py-6 flex flex-col items-center">
        <div className="mb-3 relative">
          {profileImage ? (
            <div className="h-24 w-24 rounded-full overflow-hidden flex items-center justify-center bg-white border border-blue-100 shadow-md">
              <img 
                src={profileImage} 
                alt="Avatar" 
                className="max-w-full max-h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23cccccc' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E";
                }}
              />
            </div>
          ) : (
            <div className="h-24 w-24 rounded-full border border-blue-100 flex items-center justify-center bg-gradient-to-br from-blue-50 to-white shadow-md">
              <UserCircle className="h-12 w-12 text-blue-300" />
            </div>
          )}
          <div className="absolute -bottom-1 right-0 bg-[#007AFF] p-1.5 rounded-full shadow-sm">
            <Camera className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="mt-2">
          <FileUpload 
            onUpload={handleProfileImageUpload}
            accept=".jpg,.jpeg,.png"
            buttonLabel="Cambiar avatar"
            buttonClassName="bg-[#007AFF] hover:bg-blue-600 text-white rounded-full text-sm font-medium px-4 py-1.5 border-0 shadow-sm"
          />
        </div>
      </div>
      
      {/* Formulario */}
      <div className="px-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre completo</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre completo"
            className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 shadow-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tu correo electrónico"
            className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 shadow-sm"
          />
        </div>
        
        <Button 
          onClick={() => updateProfileMutation.mutate()}
          disabled={isUpdatingProfile}
          className="w-full mt-4 bg-[#007AFF] hover:bg-blue-600 rounded-xl h-12 shadow-sm"
        >
          {isUpdatingProfile ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </div>
    </div>
  );
  
  // Renderizar sección de seguridad
  const renderSecuritySection = () => (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-5 py-3">
        <h2 className="text-lg font-medium text-gray-800">Seguridad</h2>
      </div>
      
      {/* Formulario */}
      <div className="px-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña actual</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Tu contraseña actual"
            className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 shadow-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nueva contraseña</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nueva contraseña"
            className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 shadow-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar contraseña</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirma tu nueva contraseña"
            className="w-full p-3.5 bg-[#F6F8FA] rounded-xl border-0 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 shadow-sm"
          />
        </div>
        
        <Button 
          onClick={() => updatePasswordMutation.mutate()}
          disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
          className="w-full mt-4 bg-[#007AFF] hover:bg-blue-600 rounded-xl h-12 shadow-sm"
        >
          {isUpdatingPassword ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Actualizar contraseña"
          )}
        </Button>
      </div>
    </div>
  );
  
  // Renderizar sección de preferencias
  const renderPreferencesSection = () => (
    <div className="space-y-5">
      {/* Cabecera */}
      <div className="flex items-center justify-between px-5 py-3">
        <h2 className="text-lg font-medium text-gray-800">Preferencias</h2>
      </div>
      
      {/* Lista de preferencias */}
      <div className="px-5 space-y-4">
        <div className="bg-white rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
          {/* Notificaciones */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                <Bell className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-800">Notificaciones por email</h3>
                <p className="text-xs text-gray-500">Recibe recordatorios y avisos</p>
              </div>
            </div>
            <Switch
              checked={isEmailNotificationsEnabled}
              onCheckedChange={setIsEmailNotificationsEnabled}
              className="data-[state=checked]:bg-[#007AFF]"
            />
          </div>
          
          {/* Tema */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                {isDarkModeEnabled ? (
                  <Moon className="h-4 w-4 text-indigo-500" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-800">Modo oscuro</h3>
                <p className="text-xs text-gray-500">Reduce la fatiga visual</p>
              </div>
            </div>
            <Switch
              checked={isDarkModeEnabled}
              onCheckedChange={handleThemeChange}
              className="data-[state=checked]:bg-[#007AFF]"
            />
          </div>
        </div>
        
        {/* Cerrar sesión */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full mt-4 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-xl h-12"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header estilo iOS */}
      <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <button 
          onClick={() => navigate("/")} 
          className="flex items-center text-[#007AFF]"
        >
          <ChevronLeft className="h-5 w-5" />
          <span>Atrás</span>
        </button>
        <span className="font-medium">Configuración</span>
        <div className="w-16"></div> {/* Espacio para equilibrar el header */}
      </header>

      {/* Menú de navegación */}
      <div className="bg-white p-1 m-3 rounded-xl shadow-sm">
        <div className="grid grid-cols-3 divide-x divide-gray-100">
          <button
            className={`py-2.5 px-2 flex justify-center items-center rounded-lg transition-colors ${
              activeSection === "general" ? "bg-[#007AFF]/10 text-[#007AFF]" : "text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => setActiveSection("general")}
          >
            <User className="h-4 w-4 mr-1.5" />
            <span className="text-sm font-medium">Perfil</span>
          </button>
          
          <button
            className={`py-2.5 px-2 flex justify-center items-center rounded-lg transition-colors ${
              activeSection === "security" ? "bg-[#007AFF]/10 text-[#007AFF]" : "text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => setActiveSection("security")}
          >
            <Shield className="h-4 w-4 mr-1.5" />
            <span className="text-sm font-medium">Seguridad</span>
          </button>
          
          <button
            className={`py-2.5 px-2 flex justify-center items-center rounded-lg transition-colors ${
              activeSection === "preferences" ? "bg-[#007AFF]/10 text-[#007AFF]" : "text-gray-600 hover:bg-gray-50"
            }`}
            onClick={() => setActiveSection("preferences")}
          >
            <Settings className="h-4 w-4 mr-1.5" />
            <span className="text-sm font-medium">Ajustes</span>
          </button>
        </div>
      </div>

      {/* Contenido de la sección activa */}
      <div className="pb-24">
        {activeSection === "general" && renderGeneralSection()}
        {activeSection === "security" && renderSecuritySection()}
        {activeSection === "preferences" && renderPreferencesSection()}
      </div>
    </div>
  );
};

export default MobileSettingsPage;