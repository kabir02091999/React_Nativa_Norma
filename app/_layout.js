/* import { View , Text} from 'react-native';

import NewCliente from './paginas/NewCliente';


import { Drawer } from 'expo-router/drawer';

export default function Layout() {
  return (
    <Drawer>
      <Drawer.Screen
        name="index" 
        options={{
          drawerLabel: 'Home',
          title: 'homa',
        }}
        
      />
      <Drawer.Screen
        name="paginas/NewCliente" 
        options={{
          drawerLabel: 'new client',
          title: 'New Cliente',
        }}
      />
      <Drawer.Screen
        name="index2" 
        options={{
          drawerLabel: 'index2',
          title: 'Index2',
        }}
      />
      <Drawer.Screen
        name="paginas/crub" 
        options={{
          drawerLabel: 'crub',
          title: 'Crub',
        }}
      />

    </Drawer>
  );
} */

import React, { useEffect, useState } from 'react'; 
import { View , Text, ActivityIndicator, Alert, StyleSheet } from 'react-native'; 
import { Drawer } from 'expo-router/drawer';

// 1. Importar la función de inicialización de la BD
import { initDatabase } from '../utils/db.js'; // Asegúrate que esta ruta sea correcta: .. fuera de app/ y luego utils/db.js

export default function Layout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [errorDb, setErrorDb] = useState(null);

  // 2. Inicialización de la BD al montar el componente
  useEffect(() => {
    // La inicialización se corre UNA SOLA VEZ al inicio.
    initDatabase() 
      .then(() => {
        setIsDbReady(true);
        console.log("Base de datos inicializada con éxito.");
      })
      .catch((error) => {
        console.error("Error al inicializar la BD:", error);
        setErrorDb(error.message || "Error desconocido al preparar la base de datos.");
      });
  }, []); 

  // 3. Manejo de estados y errores

  // Si hay un error crítico en la BD
  if (errorDb) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>🚨 Error Crítico de Inicialización 🚨</Text>
        <Text style={styles.errorText}>No se pudo iniciar la aplicación debido a un problema con la base de datos.</Text>
        <Text style={styles.errorDetail}>Detalle: {errorDb}</Text>
      </View>
    );
  }

  // Si la BD se está inicializando
  if (!isDbReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando datos de la aplicación...</Text>
      </View>
    );
  }

  // 4. Renderizar el Drawer una vez que la BD esté lista
  return (
    <Drawer>
      <Drawer.Screen
        name="index" 
        options={{
          drawerLabel: 'Home',
          title: 'Home',
        }}
      />
      <Drawer.Screen
        name="paginas/NewCliente" 
        options={{
          drawerLabel: 'new client',
          title: 'New Cliente',
        }}
      />
      <Drawer.Screen
        name="paginas/Buscar_Local" 
        options={{
          drawerLabel: 'buscar local',
          title: 'Buscar Local',
        }}
      />
      <Drawer.Screen
        name="index2" 
        options={{
          drawerLabel: 'index2',
          title: 'Index2',
        }}
      />
      <Drawer.Screen
        name="paginas/crub" 
        options={{
          drawerLabel: 'crub',
          title: 'Crub',
        }}
      />
      <Drawer.Screen
        name="paginas/[ID]" 
        options={{
          drawerLabel: 'Local',
          title: 'Local',
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#f5f5f5'
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666'
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'red',
        marginBottom: 8
    },
    errorText: {
        textAlign: 'center',
        paddingHorizontal: 20,
        color: '#333'
    },
    errorDetail: {
        marginTop: 10,
        fontSize: 14,
        color: '#888'
    }
});