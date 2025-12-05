/*import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const RADIO_METERS = 750; // Buscamos en 750 metros (para evitar el error 504)
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const TAGS_COMERCIALES = "supermarket|bakery|butcher|clothes|hardware|bookstore|chemist";
const TAGS_SERVICIOS = "cafe|restaurant|bar|bank|pharmacy|post_office|hairdresser|atm|clinic";


export default function ListaNegocios() {
  const [location, setLocation] = useState(null);
  const [negocios, setNegocios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    obtenerUbicacionYNegocios();
  }, []);

  const buscarNegocios = async (lat, lon) => {
    
    const query = `
      [out:json][timeout:25];
      (
        // Búsqueda de tiendas (shop)
        node["shop"~"${TAGS_COMERCIALES}"](around:${RADIO_METERS},${lat},${lon});
        way["shop"~"${TAGS_COMERCIALES}"](around:${RADIO_METERS},${lat},${lon});
        relation["shop"~"${TAGS_COMERCIALES}"](around:${RADIO_METERS},${lat},${lon});
        
        // Búsqueda de servicios/lugares de interés (amenity)
        node["amenity"~"${TAGS_SERVICIOS}"](around:${RADIO_METERS},${lat},${lon});
        way["amenity"~"${TAGS_SERVICIOS}"](around:${RADIO_METERS},${lat},${lon});
        relation["amenity"~"${TAGS_SERVICIOS}"](around:${RADIO_METERS},${lat},${lon});
      );
      out center; 
    `;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Intentando consulta Overpass (Intento ${attempt}/${MAX_RETRIES})...`);      
            const response = await axios.post(OVERPASS_URL, query);
            const listaNegocios = response.data.elements.map(element => ({
                id: element.id,
                name: element.tags.name || element.tags.operator || "Negocio sin nombre", 
                type: element.tags.shop || element.tags.amenity || "Genérico",
                latitude: element.lat || element.center.lat, 
                longitude: element.lon || element.center.lon,
                address: element.tags["addr:street"] || "Dirección no disponible",
            }));
            
            return listaNegocios;

        } catch (error) {
            if (error.response && error.response.status === 504 && attempt < MAX_RETRIES) {
                console.warn(`Error 504 detectado. Reintentando en ${RETRY_DELAY_MS / 1000}s...`);
                await delay(RETRY_DELAY_MS);
                continue;
            }
            console.error(`Error final al consultar Overpass API: ${error.message}`);
            throw new Error(`Fallo la consulta de negocios después de ${attempt} intentos. Error: ${error.message}`);
        }
    }
    return []; 
  };


  const obtenerUbicacionYNegocios = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permiso de ubicación denegado. Es necesario para buscar negocios cercanos.');
      setIsLoading(false);
      return;
    }

    let currentLocation = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = currentLocation.coords;
    setLocation({ latitude, longitude });

    try {
        const negociosEncontrados = await buscarNegocios(latitude, longitude);
        // Filtramos resultados sin coordenadas válidas por seguridad
        const negociosValidos = negociosEncontrados.filter(n => n.latitude && n.longitude);
        setNegocios(negociosValidos);
    } catch (e) {
        setErrorMsg(e.message); 
    }

    setIsLoading(false);
  };


  // --- 3. Lógica para Abrir Ubicación en Mapas Nativos ---
  const abrirUbicacionEnMapa = (lat, lon, name) => {
    // Usamos el esquema 'geo:' para la mejor compatibilidad en Android/iOS
    const url = `geo:${lat},${lon}?q=${lat},${lon}(${name})`;
    
    Linking.openURL(url).catch(err => {
        alert('No se pudo abrir la aplicación de mapas. Asegúrate de tener una instalada.');
        console.error('Error al abrir URL:', err);
    });
  };

  // --- 4. Renderizado (FlatList) ---
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.negocioItem}
      onPress={() => abrirUbicacionEnMapa(item.latitude, item.longitude, item.name)}
    >
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.address}>Tipo: **{item.type.toUpperCase()}**</Text>
      <Text style={styles.distance}>Toca para ver en el mapa 🗺️</Text>
    </TouchableOpacity>
  );
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Buscando ubicación y negocios cercanos...</Text>
      </View>
    );
  }

  if (errorMsg || !location) {
    return <View style={styles.centered}><Text style={styles.errorText}>{errorMsg || 'No se pudo obtener la ubicación.'}</Text></View>;
  }
  
  if (negocios.length === 0) {
    return <View style={styles.centered}><Text>No se encontraron negocios en un radio de {RADIO_METERS/1000} km. 😔</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Negocios Cerca de Ti (Encontrados: {negocios.length})</Text>
      <FlatList
        data={negocios}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  negocioItem: {
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 5,
    borderLeftColor: '#007AFF', // Resalta el item
    elevation: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  address: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  distance: {
    fontSize: 12,
    color: 'green',
    marginTop: 4,
    fontStyle: 'italic',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
}); */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  FlatList, 
  TouchableOpacity,
  Linking // 👈 Importante para abrir Google Maps
} from 'react-native';
import * as Location from 'expo-location';


const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_API_KEY_GOOGLE; 

const SEARCH_RADIUS = 1000; 

const PlaceCard = ({ place }) => {
  
  const openMapForPlace = () => {
    // ✅ Formato correcto para abrir Google Maps usando el Place ID:
    // La URL de búsqueda de Google Maps (maps.google.com) acepta el Place ID.
    //const url = `http://maps.google.com/?q=place_id:${place.place_id}`;
    
    // Si quieres un formato más simple solo con coordenadas, puedes usar:
    const url = `http://maps.google.com/?q=${place.geometry.location.lat},${place.geometry.location.lng}`;
    
    Linking.openURL(url).catch(err => {
      Alert.alert("Error", "No se pudo abrir Google Maps. Asegúrate de tener la aplicación o un navegador.");
      console.error('An error occurred', err);
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={openMapForPlace}>
      <Text style={styles.cardTitle}>{place.name}</Text>
      <Text style={styles.cardAddress}>{place.vicinity}</Text>
      {
        place.rating && (
          <Text style={styles.cardRating}>
            ⭐ {place.rating} ({place.user_ratings_total} {place.user_ratings_total === 1 ? 'reseña' : 'reseñas'})
          </Text>
        )
      }
      <Text style={styles.cardAction}>Toca para ver en Google Maps →</Text>
    </TouchableOpacity>
  );
};


export default function NearbyPlacesCardSearch() {
  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // --- Lógica de Ubicación ---
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permiso de acceso a la ubicación denegado. No se puede buscar negocios.');
        setLoading(false);
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  // --- Lógica de la API de Places ---
  useEffect(() => {
    console.log("Ubicación obtenida: ", GOOGLE_MAPS_API_KEY + " - " + JSON.stringify(location));
    if (location && GOOGLE_MAPS_API_KEY) {
      fetchNearbyPlaces(location.coords.latitude, location.coords.longitude);
    } else if (location && !GOOGLE_MAPS_API_KEY) {
      setErrorMsg('Error de configuración: Clave API no disponible. Verifica tu archivo .env.');
      setLoading(false);
    }
  }, [location]);

  const fetchNearbyPlaces = async (latitude, longitude) => {
    setLoading(true);
    setErrorMsg(null);
    
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${SEARCH_RADIUS}&type=store&key=${GOOGLE_MAPS_API_KEY}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        setPlaces(data.results);
      } else {
        setErrorMsg(`Error de Google Maps API: ${data.status}`);
        Alert.alert("Error de API", `Estatus: ${data.status}. Por favor, verifica tu clave y que la API de Places esté habilitada.`);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      setErrorMsg('Error de conexión. Verifica tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Obteniendo ubicación y buscando negocios...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Negocios Cercanos (1 km)</Text>
      {places.length === 0 ? (
        <Text style={styles.noResultsText}>No se encontraron negocios a 1 km de tu ubicación.</Text>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.place_id}
          renderItem={({ item }) => <PlaceCard place={item} />}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#f5f5f5',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  noResultsText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#888',
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2, // Sombra para Android
    shadowColor: '#000', // Sombra para iOS
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 3,
  },
  cardAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  cardRating: {
    fontSize: 14,
    color: '#FFD700', // Color dorado para estrellas
    marginBottom: 5,
  },
  cardAction: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF', // Azul típico de enlace/acción
    marginTop: 5,
  }
});

