import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

SplashScreen.preventAutoHideAsync();

import { useIsFocused } from '@react-navigation/native';

function CustomDrawerContent(props) {
  const router = useRouter();
  const [nombreUsuario, setNombreUsuario] = useState('Cargando...');
  // Este estado detecta si el ID del usuario cambió para forzar el redibujado
  const [currentId, setCurrentId] = useState(null); 
  const isFocused = useIsFocused();

  useEffect(() => {
    let isMounted = true;
    console.log("Drawer se enfocó, revisando token...");
    const getUserData = async () => {
      try {
        const data = await SecureStore.getItemAsync('userData');
        console.log("Datos obtenidos AAAAAAAAAAAAAAA en menú:", data);
        if (data && isMounted) {
          const user = JSON.parse(data);
          const nombreCompleto = `${user.Nombre || ''} ${user.Apellido || ''}`.trim();
          
          // Si el ID en el teléfono es distinto al que muestra el menú, actualizamos
          if (user.id !== currentId) {
            setNombreUsuario(nombreCompleto || 'Usuario');
            setCurrentId(user.id); // Guardamos el nuevo ID para que no vuelva a cargar
            console.log("Menú actualizado con éxito:", nombreCompleto);
          }
        } else if (!data && isMounted) {
          console.log("  No hay datos de usuario en SecureStore", data);
          setNombreUsuario('Invitado');
          setCurrentId(null);
        }
      } catch (e) {
        console.error("Error al leer datos:", e);
        if (isMounted) setNombreUsuario('Error');
      }
    };

    if (isFocused) {
      getUserData();
    }

    return () => { isMounted = false; };
  }, [isFocused, currentId]); // Escucha si el menú se abre o si el ID cambia

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
    setCurrentId(null); // Reseteamos el ID al salir
    router.replace('/login');
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 50 }}>
      <View style={drawerStyles.headerContainer}>
        <View style={drawerStyles.avatarCircle}>
          <Image source={require('../assets/Logo.png')} style={drawerStyles.logoImage} />
        </View>
        {/* NOMBRE GRANDE Y BLANCO */}
        <Text style={drawerStyles.userName}>{nombreUsuario}</Text>
        {/* ECOINN EN PEQUEÑO ABAJO */}
        <Text style={drawerStyles.userSub}>Ecoinn Global</Text>
      </View>

      <View style={{ flex: 1, paddingTop: 10 }}>
        <DrawerItemList {...props} />
      </View>

      <TouchableOpacity style={drawerStyles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#E74C3C" />
        <Text style={drawerStyles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function Layout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const router = useRouter();

  // 1. EFECTO DE CARGA INICIAL (Solo corre una vez)
  useEffect(() => {
    async function prepare() {
      try {
        console.log("Iniciando carga de recursos...");
        const token = await SecureStore.getItemAsync('userToken');
        setHasToken(!!token);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        // AGREGA ESTA LÍNEA PARA QUITAR LA PANTALLA BLANCA
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  // 2. EFECTO DE REDIRECCIÓN (Solo corre cuando appIsReady cambia)
  useEffect(() => {
    if (appIsReady && !hasToken) {
      console.log("No hay token, redirigiendo a login...");
      router.replace('/login');
    }
  }, [appIsReady, hasToken]);

  if (!appIsReady) {
    return (
      <View style={loadingStyles.container}>
        <Image source={require('../assets/Logo.png')} style={loadingStyles.logo} />
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ color: '#fff', marginTop: 15 }}>Iniciando Ecoinn...</Text>
      </View>
    );
  }
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#1B4F72' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        drawerActiveBackgroundColor: '#E3F2FD',
        drawerActiveTintColor: '#1B4F72',
      }}
    >
      <Drawer.Screen name="index" options={{ drawerLabel: 'Inicio', title: 'Panel Principal', drawerIcon: ({ color }) => <Ionicons name="home-outline" size={22} color={color} /> }} />
      <Drawer.Screen name="login" options={{ drawerItemStyle: { display: 'none' }, headerShown: false }} />
      <Drawer.Screen name="paginas/NewCliente" options={{ drawerLabel: 'Nuevo Cliente', title: 'Registrar', drawerIcon: ({ color }) => <Ionicons name="person-add-outline" size={22} color={color} /> }} />
      <Drawer.Screen name="paginas/Buscar_Local" options={{ drawerLabel: 'Buscar Zona', title: 'Buscador', drawerIcon: ({ color }) => <Ionicons name="search-outline" size={22} color={color} /> }} />
      <Drawer.Screen
        name="api/api"
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="paginas/NegociosCercanos"
        options={{ drawerItemStyle: { display: 'none' } }}
      />
      <Drawer.Screen
        name="paginas/[ID]"
        options={{title: 'Negocios' , drawerItemStyle: { display: 'none',  } }}
      />
      <Drawer.Screen
        name="paginas/facturaCliente/[IDLocal]"
        options={{ drawerLabel: 'Factura Cliente', title: 'Factura Cliente', drawerItemStyle: { display: 'none' } }}
      />
      {/* Ocultas */}
      <Drawer.Screen name="paginas/NewProductoAgregar" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="index2" options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer>
  );
}

const drawerStyles = StyleSheet.create({
  headerContainer: { 
    backgroundColor: '#1B4F72', 
    justifyContent: 'center', 
    alignItems: 'center', 
    // Movimiento vertical
    marginTop: -60, 
    paddingTop: 60,
    height: 250,
    
    // --- ESTO ARREGLA LOS LATERALES ---
    width: '110%',        // Ocupa todo el ancho disponible
    alignSelf: 'stretch', // Se estira para ignorar paddings del padre
    marginHorizontal: -20,   // ajusta este valor si quieres más ancho
    paddingHorizontal: 100, 
    /* ojo son valores muy importanter */
},
  avatarCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  logoImage: { width: '250%', height: '350%', resizeMode: 'contain' },
  userName: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
  userSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', padding: 20, borderTopWidth: 1, borderTopColor: '#f4f4f4' },
  logoutText: { marginLeft: 15, color: '#E74C3C', fontWeight: 'bold' },
  footer: { padding: 20, alignItems: 'center' },
  footerText: { color: '#999', fontSize: 12 }
});

const loadingStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B4F72', justifyContent: 'center', alignItems: 'center' },
  logo: { width: 200, height: 200, marginBottom: 20, resizeMode: 'contain' },
});