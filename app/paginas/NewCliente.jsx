import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  Dimensions, 
  ActivityIndicator
} from 'react-native';
import * as Location from 'expo-location'; 
import MapView, { Marker } from 'react-native-maps';

// 1. IMPORTAR LA FUNCIÓN DE INSERCIÓN DE LA BASE DE DATOS
import { insertLocal } from '../../utils/db'; // Asegúrate de que esta ruta sea correcta: '..'/utils/db

const { height } = Dimensions.get('window');
const MAP_HEIGHT = height * 0.4;

function NewCliente() {
  const [ciRif, setCiRif] = useState('');        
  const [tipoLocal, setTipoLocal] = useState('');  
  const [nombreLocal, setNombreLocal] = useState(''); 
  const [ubicacionTexto, setUbicacionTexto] = useState(''); 
  
  const [currentLocation, setCurrentLocation] = useState(null); 
  const [isLoading, setIsLoading] = useState(false); 

  // Función para resetear el formulario
  const resetForm = () => {
    setCiRif('');
    setTipoLocal('');
    setNombreLocal('');
    setUbicacionTexto('');
    setCurrentLocation(null);
  };

  const handleSubmit = async () => {
    // VALIDACIÓN DE LOS CAMPOS CRÍTICOS
    if (!ciRif || !nombreLocal) {
      Alert.alert("Error", "Por favor, ingresa el C.I./RIF y el Nombre del Local.");
      return;
    }
    
    setIsLoading(true); 

    // --- Lógica de Permisos ---
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Denegado', 'El acceso a la ubicación es necesario para el registro del local.');
      setIsLoading(false); 
      return;
    }

    try {
      // 2. Obtener la ubicación
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      
      const localData = {
        ciRif,
        tipoLocal,
        nombreLocal,
        ubicacionTexto,
        location: { latitude, longitude }
      };

      // 3. LLAMAR A LA FUNCIÓN DE INSERCIÓN DE LA BD
      const insertId = await insertLocal(localData);

      // Guardar ubicación y mostrar éxito
      setCurrentLocation({ latitude, longitude }); 

      Alert.alert(
        "✅ Local Registrado",
        `El local "${nombreLocal}" ha sido guardado con éxito.\nID: ${insertId}`
      );
      
      // 4. Limpiar el formulario después del éxito
      resetForm();

    } catch (error) {
      console.error("Error en el registro:", error);
      
      // Mostrar el error específico de la BD si existe (ej: CI/RIF duplicado)
      Alert.alert("Error al Guardar", error.message || "No se pudo registrar el local. Verifica la conexión.");
      
      setCurrentLocation(null); 
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      {/* ... (El resto del return sigue igual) ... */}
      <View style={styles.container}>
        
        {/* --- Título y Formulario del Local --- */}
        <Text style={styles.title}>Registro de Local</Text>
        
        <TextInput
          style={styles.input}
          placeholder="C.I. / RIF"
          keyboardType="default"
          autoCapitalize="none"
          value={ciRif}
          onChangeText={setCiRif}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Nombre del Local"
          value={nombreLocal}
          onChangeText={setNombreLocal}
        />

        <TextInput
          style={styles.input}
          placeholder="Tipo de Local (Ej: Restaurante, Tienda)"
          value={tipoLocal}
          onChangeText={setTipoLocal}
        />

        <TextInput
          style={styles.input}
          placeholder="Ubicación (Referencia escrita)"
          value={ubicacionTexto}
          onChangeText={setUbicacionTexto}
        />

        {/* Botón de Enviar */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Registrar Local y Obtener GPS</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* --- Lógica del Mapa --- */}
        {currentLocation && (
          <View style={styles.mapContainer}>
            <Text style={styles.mapTitle}>
              ✅ Última Ubicación GPS Registrada:
            </Text>
            <Text style={styles.locationText}>
              Latitud: {currentLocation.latitude.toFixed(6)} | Longitud: {currentLocation.longitude.toFixed(6)}
            </Text>
            
            <MapView
              style={styles.map}
              initialRegion={{ 
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.005, 
                longitudeDelta: 0.005, 
              }}
            >
              <Marker
                coordinate={currentLocation}
                title={nombreLocal || "Ubicación del Local"}
                description={ubicacionTexto || "Coordenadas obtenidas"}
                pinColor="green"
              />
            </MapView>
          </View>
        )}
        
      </View>
    </ScrollView>
  );
};

// ... (Styles siguen iguales) ...
const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#f9f9f9',
  },
  container: {
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    elevation: 2,
    height: 50, 
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 30,
  },
  mapContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#444',
  },
  locationText: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    color: '#666',
  },
  map: {
    width: '100%',
    height: MAP_HEIGHT,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
  },
});

export default NewCliente;