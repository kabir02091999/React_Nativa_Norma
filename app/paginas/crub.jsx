/* import React, { useState, useEffect } from 'react';
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



const GOOGLE_MAPS_API_KEY = process.env.API_KEY_GOOGLE; 

// Radio de búsqueda: 1 km = 1000 metros
const SEARCH_RADIUS = 1000; 

// Componente individual para cada negocio
const PlaceCard = ({ place }) => {
  
  // Función para abrir Google Maps al tocar la tarjeta
  const openMapForPlace = () => {
    // Usamos el Place ID para garantizar que Maps encuentre el lugar exacto.
    // La URL de búsqueda de Google Maps es compatible con el Place ID.
    const url = `https://www.google.com/maps/search/?api=1&query_place_id=${place.place_id}`;
    
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
}); */