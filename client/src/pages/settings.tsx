import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Save, Upload, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const [isEmailNotificationsEnabled, setIsEmailNotificationsEnabled] = useState(true);
  const [isDarkModeEnabled, setIsDarkModeEnabled] = useState(false);
  
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
  
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
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
  
  const handleSavePreferences = () => {
    toast({
      title: "Preferencias guardadas",
      description: "Tus preferencias han sido guardadas correctamente",
    });
  };

  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="md:ml-16">
        <h1 className="text-2xl font-bold text-neutral-800">Configuración</h1>
        <p className="text-neutral-500">
          Gestiona tu cuenta y tus preferencias
        </p>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Perfil</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="preferences">Preferencias</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          {/* Imagen de perfil */}
          <Card>
            <CardHeader>
              <CardTitle>Imagen de perfil</CardTitle>
              <CardDescription>
                Sube una foto que aparecerá junto a tu nombre
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={user?.profileImage ? user.profileImage : undefined} 
                      alt={user?.name || "Usuario"} 
                    />
                    <AvatarFallback className="text-lg">
                      {user?.name?.split(' ').map(n => n[0]).join('') || <User />}
                    </AvatarFallback>
                  </Avatar>
                  {uploadingProfileImage && (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
                
                <div className="flex-1">
                  <p className="text-sm mb-3">
                    Sube una imagen JPG, PNG o JPEG. Esta imagen se mostrará junto a tu nombre en la aplicación.
                  </p>
                  <FileUpload 
                    onUpload={handleProfileImageUpload} 
                    accept=".jpg,.jpeg,.png"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Información del perfil */}
          <Card>
            <CardHeader>
              <CardTitle>Información de perfil</CardTitle>
              <CardDescription>
                Actualiza tu información personal
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleProfileSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input 
                    id="name" 
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                    placeholder="Tu nombre" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                    placeholder="tu@email.com" 
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="ml-auto"
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
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cambiar contraseña</CardTitle>
              <CardDescription>
                Actualiza tu contraseña para mantener tu cuenta segura
              </CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña actual</Label>
                  <Input 
                    id="current-password" 
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    placeholder="••••••••" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <Input 
                    id="new-password" 
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    placeholder="••••••••" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar nueva contraseña</Label>
                  <Input 
                    id="confirm-password" 
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    placeholder="••••••••" 
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  type="submit"
                  disabled={updatePasswordMutation.isPending}
                  className="ml-auto"
                >
                  {updatePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Actualizar contraseña"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferencias de aplicación</CardTitle>
              <CardDescription>
                Personaliza tu experiencia de usuario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Notificaciones por email</Label>
                    <p className="text-sm text-muted-foreground">
                      Recibe notificaciones por email sobre facturas pendientes y recordatorios
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={isEmailNotificationsEnabled}
                    onCheckedChange={setIsEmailNotificationsEnabled}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="theme">Modo oscuro</Label>
                    <p className="text-sm text-muted-foreground">
                      Activa el modo oscuro para reducir la fatiga visual
                    </p>
                  </div>
                  <Switch
                    id="theme"
                    checked={isDarkModeEnabled}
                    onCheckedChange={setIsDarkModeEnabled}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSavePreferences}
                className="ml-auto"
              >
                <Save className="mr-2 h-4 w-4" />
                Guardar preferencias
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
