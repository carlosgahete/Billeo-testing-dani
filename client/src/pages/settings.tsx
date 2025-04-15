import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Save, Upload, User, Moon, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import MobileSettingsPage from "@/components/settings/MobileSettingsPage";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FileUpload from "@/components/common/FileUpload";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UserSession {
  authenticated: boolean;
  user?: {
    id: number;
    username: string;
    name: string;
    email: string;
    role: string;
    profileImage?: string | null;
  };
}

const SettingsPage = () => {
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const { theme, setTheme, toggleTheme } = useTheme();
  const [isEmailNotificationsEnabled, setIsEmailNotificationsEnabled] = useState(true);
  const [isDarkModeEnabled, setIsDarkModeEnabled] = useState(theme === "dark");
  
  // Escuchar cambios en el tema global
  useEffect(() => {
    setIsDarkModeEnabled(theme === "dark");
  }, [theme]);
  
  const { data: sessionData, isLoading: userLoading } = useQuery<UserSession>({
    queryKey: ["/api/auth/session"],
  });
  
  const user = sessionData?.user;
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    profileImage: ""
  });
  
  // Profile image state
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  
  // Profile image upload mutation
  const updateProfileImageMutation = useMutation({
    mutationFn: async (imagePath: string) => {
      if (!user) throw new Error("User not authenticated");
      
      // Crear un FormData para enviar la imagen correctamente
      const formData = new FormData();
      formData.append("profileImage", imagePath);
      
      // Realizar la solicitud directamente ya que necesitamos FormData
      const response = await fetch(`/api/users/${user.id}/profile-image`, {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar la imagen de perfil");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      // Actualizar los datos del usuario en el sidebar
      refreshUser();
      setUploadingProfileImage(false);
      toast({
        title: "Imagen actualizada",
        description: "Tu imagen de perfil ha sido actualizada correctamente",
      });
    },
    onError: (error: any) => {
      setUploadingProfileImage(false);
      toast({
        title: "Error",
        description: `No se pudo actualizar la imagen: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleProfileImageUpload = (filePath: string) => {
    setUploadingProfileImage(true);
    // Aquí filePath es la ruta de la imagen ya subida
    // Actualizamos el perfil de usuario con esta ruta
    updateProfileMutation.mutate({
      ...profileForm,
      profileImage: filePath // Agregar la imagen de perfil a los datos del usuario
    });
    setUploadingProfileImage(false);
  };
  
  // Initialize form with user data when loaded
  useEffect(() => {
    if (user && !userLoading) {
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        profileImage: user.profileImage || ""
      });
    }
  }, [user, userLoading]);
  
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      if (!user) throw new Error("User not authenticated");
      return apiRequest("PUT", `/api/users/${user.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      // Actualizar los datos del usuario en el sidebar
      refreshUser();
      toast({
        title: "Perfil actualizado",
        description: "Tu información de perfil ha sido actualizada correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar el perfil: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const updatePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordForm) => {
      if (!user) throw new Error("User not authenticated");
      return apiRequest("PUT", `/api/users/${user.id}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
    },
    onSuccess: () => {
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido actualizada correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `No se pudo actualizar la contraseña: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Ya no necesitamos la mutación para actualizar el número de cuenta bancaria

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateProfileMutation.mutate({
      name: profileForm.name,
      email: profileForm.email,
      profileImage: profileForm.profileImage
    });
  };
  
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }
    
    updatePasswordMutation.mutate(passwordForm);
  };
  
  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: { emailNotifications: boolean }) => {
      return apiRequest("POST", "/api/dashboard/preferences", preferences);
    },
    onSuccess: () => {
      toast({
        title: "Preferencias guardadas",
        description: "Tus preferencias han sido guardadas correctamente",
        variant: "default",
      });
      // Refrescar datos del usuario para actualizar preferencias
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/preferences"] });
    },
    onError: (error) => {
      console.error("Error al guardar preferencias:", error);
      toast({
        title: "Error al guardar",
        description: "No se pudieron guardar tus preferencias. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  });

  const handleSavePreferences = () => {
    // Guarda el tema en localStorage
    localStorage.setItem("theme", theme);
    
    // Guardar preferencias en el servidor
    savePreferencesMutation.mutate({ 
      emailNotifications: isEmailNotificationsEnabled 
    });
  };

  // Cargar preferencias existentes
  const { data: userPreferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["/api/dashboard/preferences"],
    enabled: !!user,
    onSuccess: (data) => {
      if (data && data.emailNotifications !== undefined) {
        setIsEmailNotificationsEnabled(data.emailNotifications);
      }
    }
  });
  
  // Verificar si estamos en vista móvil
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  if (userLoading || preferencesLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }
  
  // Renderizar versión móvil
  if (isMobile) {
    return (
      <MobileSettingsPage 
        isEmailNotificationsEnabled={isEmailNotificationsEnabled} 
        setIsEmailNotificationsEnabled={setIsEmailNotificationsEnabled}
        onSavePreferences={handleSavePreferences}
      />
    );
  }
  
  return (
    <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
      {/* Encabezado estilo Apple - Solo visible en escritorio */}
      <div className="mb-8">
        <div className="flex items-center mb-4 space-x-3">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-2xl shadow-sm">
            <User className="h-6 w-6 text-gray-600" />
          </div>
          <h1 className="text-2xl font-medium text-gray-900">Configuración</h1>
        </div>
        <p className="text-gray-500 ml-12 max-w-3xl">
          Administra tu perfil, preferencias y configuración de seguridad
        </p>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-8 p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl flex space-x-1 w-fit">
          <TabsTrigger className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 px-4 py-2.5 text-sm font-medium" value="profile">Perfil</TabsTrigger>
          <TabsTrigger className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 px-4 py-2.5 text-sm font-medium" value="security">Seguridad</TabsTrigger>
          <TabsTrigger className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 px-4 py-2.5 text-sm font-medium" value="preferences">Preferencias</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-8">
          {/* Imagen de perfil - Estilo Apple */}
          <div className="backdrop-blur-sm bg-white/80 rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center mb-5 space-x-3">
              <div className="rounded-full bg-blue-50 p-2">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Imagen de perfil</h3>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-32 w-32 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <AvatarImage 
                    src={user?.profileImage ? user.profileImage : undefined} 
                    alt={user?.name || "Usuario"} 
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('') : <User className="h-10 w-10" />}
                  </AvatarFallback>
                </Avatar>
                {uploadingProfileImage && (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm text-blue-500">Actualizando...</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 mt-4 md:mt-0">
                <p className="text-gray-600 mb-4">
                  Esta imagen aparecerá en tu perfil y en tus facturas generadas. Sube una imagen profesional en formato JPG, PNG o JPEG.
                </p>
                <FileUpload 
                  onUpload={handleProfileImageUpload} 
                  accept=".jpg,.jpeg,.png"
                  buttonLabel="Cambiar imagen"
                />
              </div>
            </div>
          </div>
          
          {/* Información del perfil - Estilo Apple */}
          <form onSubmit={handleProfileSubmit}>
            <div className="backdrop-blur-sm bg-white/80 rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center mb-5 space-x-3">
                <div className="rounded-full bg-purple-50 p-2">
                  <User className="h-5 w-5 text-purple-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Información personal</h3>
              </div>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 font-medium">Nombre completo</Label>
                  <Input 
                    id="name" 
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                    placeholder="Tu nombre" 
                    className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">Correo electrónico</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                    placeholder="tu@email.com" 
                    className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 shadow-sm"
                  />
                </div>
                
                <div className="pt-4 flex justify-end">
                  <Button 
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="shadow-sm bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium px-5 py-2 h-auto rounded-lg transition-all"
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar cambios
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-8">
          {/* Contraseña - Estilo Apple */}
          <form onSubmit={handlePasswordSubmit}>
            <div className="backdrop-blur-sm bg-white/80 rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center mb-5 space-x-3">
                <div className="rounded-full bg-green-50 p-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-5 w-5 text-green-500">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">Seguridad de la cuenta</h3>
              </div>
              
              <div className="space-y-5">
                <p className="text-gray-600 mb-4">
                  Actualiza tu contraseña regularmente para mantener tu cuenta segura. Usa una combinación de letras, números y símbolos.
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-gray-700 font-medium">Contraseña actual</Label>
                  <Input 
                    id="current-password" 
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    placeholder="••••••••" 
                    className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-green-400 focus:ring-1 focus:ring-green-100 shadow-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-gray-700 font-medium">Nueva contraseña</Label>
                  <Input 
                    id="new-password" 
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    placeholder="••••••••" 
                    className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-green-400 focus:ring-1 focus:ring-green-100 shadow-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1 ml-1">
                    La contraseña debe tener al menos 6 caracteres.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-gray-700 font-medium">Confirmar nueva contraseña</Label>
                  <Input 
                    id="confirm-password" 
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    placeholder="••••••••" 
                    className="h-10 rounded-lg border-gray-200 bg-white/90 focus:border-green-400 focus:ring-1 focus:ring-green-100 shadow-sm"
                  />
                </div>
                
                <div className="pt-4 flex justify-end">
                  <Button 
                    type="submit"
                    disabled={updatePasswordMutation.isPending}
                    className="shadow-sm bg-gradient-to-b from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-medium px-5 py-2 h-auto rounded-lg transition-all"
                  >
                    {updatePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Actualizando...
                      </>
                    ) : (
                      "Cambiar contraseña"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </TabsContent>
        
        <TabsContent value="preferences" className="space-y-8">
          {/* Preferencias - Estilo Apple */}
          <div className="backdrop-blur-sm bg-white/80 rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center mb-5 space-x-3">
              <div className="rounded-full bg-amber-50 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="h-5 w-5 text-amber-500">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Preferencias de aplicación</h3>
            </div>
            
            <div className="space-y-6">
              <p className="text-gray-600 mb-2">
                Personaliza tu experiencia de Billeo ajustando las siguientes opciones.
              </p>
              
              {/* Notificaciones */}
              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="notifications" className="text-gray-700 font-medium flex items-center space-x-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="text-amber-500">
                        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path>
                        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path>
                      </svg>
                      <span>Notificaciones por email</span>
                    </Label>
                    <p className="text-sm text-gray-500">
                      Recibe notificaciones por email sobre facturas pendientes y recordatorios
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={isEmailNotificationsEnabled}
                    onCheckedChange={setIsEmailNotificationsEnabled}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>
              </div>
              
              {/* Opción de tema oscuro eliminada */}
              
              <div className="pt-4 flex justify-end">
                <Button 
                  onClick={handleSavePreferences}
                  className="shadow-sm bg-gradient-to-b from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-medium px-5 py-2 h-auto rounded-lg transition-all"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Guardar preferencias
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
