import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator, TouchableOpacity, BackHandler, Platform, Alert } from 'react-native';
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { initDatabase, migrarCensoLocal, migrarTablaLocal, verificarLocales, DeleLocales } from '../utils/db';


SplashScreen.preventAutoHideAsync();

// ─── Captura global de errores para detectar crashes silenciosos ───────────────
if (__DEV__) {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('💥 CRASH GLOBAL:', error?.message, error?.stack);
    originalHandler(error, isFatal);
  });
}

// ─── DRAWER ────────────────────────────────────────────────────────────────────
function CustomDrawerContent(props) {
  const router = useRouter();
  const [nombreUsuario, setNombreUsuario] = useState('Cargando...');
  const [currentId, setCurrentId] = useState(null);


  // ── Cerrar sesión ────────────────────────────────────────────────────────────
  const handleLogout1 = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
      setCurrentId(null);

      if (Platform.OS === 'android') {
        BackHandler.exitApp();
      } else {
        router.replace('/login');
        Alert.alert('Cerrar Sesión', 'Has cerrado sesión correctamente.');
      }
    } catch (e) {
      console.error('Error al cerrar sesión:', e);
    }
  };

  // ── Cargar datos del usuario ─────────────────────────────────────────────────
  useEffect(() => {
  let isMounted = true;

  const init = async () => {
    verificarLocales();
    try {
      await initDatabase();
      await migrarCensoLocal();
      await migrarTablaLocal();
      console.log('Base de datos inicializada correctamente');
    } catch (e) {
      console.error('Error al inicializar DB:', e);
    }

    try {
      const data = await SecureStore.getItemAsync('userData');
      console.log('Datos obtenidos en menú:', data);

      if (data && isMounted) {
        const user = JSON.parse(data);
        const nombreCompleto = `${user.Nombre || ''} ${user.Apellido || ''}`.trim();
        setNombreUsuario(nombreCompleto || 'Usuario');
        setCurrentId(user.id);
      } else if (!data && isMounted) {
        console.log('No hay datos de usuario en SecureStore');
        setNombreUsuario('Invitado');
        setCurrentId(null);
      }
    } catch (e) {
      console.error('Error al leer userData:', e);
      if (isMounted) setNombreUsuario('Error');
    }
  };

  init();

  const unsubscribe = props.navigation.addListener('focus', init);

  return () => {
    isMounted = false;
    unsubscribe();
  };
}, []);

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 50 }}>
      <View style={drawerStyles.headerContainer}>
        <View style={drawerStyles.avatarCircle}>
          <Image source={require('../assets/Logo.png')} style={drawerStyles.logoImage} />
        </View>
        <Text style={drawerStyles.userName}>{nombreUsuario}</Text>
        <Text style={drawerStyles.userSub}>Ecoinn Global</Text>
      </View>

      <View style={{ flex: 1, paddingTop: 10 }}>
  {props.state.routes.map((route, index) => {
    const { options } = props.descriptors[route.key];

    if (options.drawerItemStyle?.display === 'none') return null;

    const label = options.drawerLabel ?? options.title ?? route.name;
    const isFocused = props.state.index === index;

    return (
      <TouchableOpacity
        key={route.key}
        onPress={() => props.navigation.navigate(route.name)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          marginHorizontal: 8,
          marginVertical: 2,
          borderRadius: 8,
          backgroundColor: isFocused ? '#E3F2FD' : 'transparent',
        }}
      >
        {options.drawerIcon
          ? options.drawerIcon({
              color: isFocused ? '#1B4F72' : '#5D7A8A',
              size: 22,
              focused: isFocused,
            })
          : null}
        <Text
          style={{
            marginLeft: 14,
            fontSize: 14,
            color: isFocused ? '#1B4F72' : '#333',
            fontWeight: isFocused ? '700' : '500',
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  })}
</View>

      <TouchableOpacity style={drawerStyles.logoutButton} onPress={handleLogout1}>
        <Ionicons name="log-out-outline" size={22} color="#E74C3C" />
        <Text style={drawerStyles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

// ─── LAYOUT PRINCIPAL ──────────────────────────────────────────────────────────
export default function Layout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const prepare = async () => {
      try {
        console.log('Iniciando carga de recursos...');
        setHasToken(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn('Error en prepare:', e);
      } finally {
        setAppIsReady(true);
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          console.warn('Error al ocultar SplashScreen:', e);
        }
      }
    };

    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady && !hasToken) {
      console.log('No hay token, redirigiendo a login...');
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
      <Drawer.Screen name="index2" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="login" options={{ drawerItemStyle: { display: 'none' }, headerShown: false }} />
      <Drawer.Screen
        name="paginas/NewClienteLocal"
        options={{
          drawerLabel: 'Clientes Local',
          title: 'Cliente Nuevo',
          drawerItemStyle: { display: 'flex' },
          drawerIcon: ({ color }) => <Ionicons name="people-outline" size={22} color={color} />
        }}
      />
      
      <Drawer.Screen name="paginas/Buscar_Local" options={{ drawerLabel: 'Buscar Zona', title: 'Buscador', drawerItemStyle: { display: 'none' }, drawerIcon: ({ color }) => <Ionicons name="search-outline" size={22} color={color} /> }} />
      <Drawer.Screen name="api/api" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen
        name="paginas/local/ListaCenso"
        options={{ drawerLabel: 'Censo Local', title: 'Censo Local', drawerIcon: ({ color }) => <Ionicons name="list-outline" size={22} color={color} /> }}
      />
      <Drawer.Screen
        name="paginas/Pedidos"
        options={{
          drawerLabel: 'Mis Pedidos',
          title: 'Mis Pedidos',
          drawerIcon: ({ color }) => <Ionicons name="receipt-outline" size={22} color={color} />
        }}
      />
      <Drawer.Screen
        name="paginas/ventas"
        options={{
          drawerLabel: 'Ventas',
          title: 'Ventas',
          drawerIcon: ({ color }) => <Ionicons name="cart-outline" size={22} color={color} />
        }}
      />
      <Drawer.Screen name="paginas/NegociosCercanos" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="paginas/[ID]" options={{ title: 'Negocios', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="paginas/facturaCliente/[IDLocal]" options={{ drawerLabel: 'Factura Cliente', title: 'Factura Cliente', drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="paginas/NewProductoAgregar" options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="paginas/NewCliente" options={{ drawerLabel: 'Nuevo Cliente', title: 'Registrar', drawerIcon: ({ color }) => <Ionicons name="person-add-outline" size={22} color={color} /> }} />
    </Drawer>
  );
}

// ─── ESTILOS ───────────────────────────────────────────────────────────────────
const drawerStyles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#1B4F72',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -60,
    paddingTop: 60,
    height: 250,
    width: '110%',
    alignSelf: 'stretch',
    marginHorizontal: -20,
    paddingHorizontal: 100,
  },
  avatarCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  logoImage: { width: '110%', height: '150%', resizeMode: 'contain' },
  userName: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
  userSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', padding: 20, borderTopWidth: 1, borderTopColor: '#f4f4f4' },
  logoutText: { marginLeft: 15, color: '#E74C3C', fontWeight: 'bold' },
  footer: { padding: 20, alignItems: 'center' },
  footerText: { color: '#999', fontSize: 12 },
});

const loadingStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1B4F72', justifyContent: 'center', alignItems: 'center' },
  logo: { width: 200, height: 200, marginBottom: 20, resizeMode: 'contain' },
});