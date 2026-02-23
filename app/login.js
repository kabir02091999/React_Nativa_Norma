import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import api, { loginUsuario } from './api/api'; // 

export default function LoginScreen() {
  const [nombre, setNombre] = useState('');
  const [clave, setClave] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!nombre || !clave) {
      Alert.alert("Error", "Por favor, rellena todos los campos.");
      return;
    }

    setLoading(true);
    try {
      // 1. Usamos la función del archivo api.js
      const data = await loginUsuario(nombre, clave);

      // 2. Extraemos token y el objeto user (que contiene el ID)
      const { token, user } = data;

      // 3. Guardamos localmente
      await SecureStore.setItemAsync('userToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(user));

      setLoading(false);
      
      // 4. Vamos al panel principal
      router.replace('/'); 
      
    } catch (error) {
      setLoading(false);
      // El backend suele enviar el error en error.response.data.message
      const msg = error.response?.data?.message || "Usuario o clave incorrectos";
      Alert.alert("Error de Inicio", msg);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.mainContainer}
    >
      <View style={styles.container}>
        {/* Logo con el mismo estilo de tu Splash */}
        <View style={styles.logoContainer}>
          <View style={styles.circle}>
             <Image 
              source={require('../assets/Logo.png')} 
              style={styles.logo} 
            />
          </View>
        </View>

        <Text style={styles.title}>Ecoinn Global</Text>
        <Text style={styles.subtitle}>Gestión de Ventas</Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Usuario</Text>
            <TextInput
              style={styles.input}
              placeholder="Ingresa tu nombre"
              value={nombre}
              onChangeText={setNombre}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="********"
              secureTextEntry
              value={clave}
              onChangeText={setClave}
            />
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>ENTRAR</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>Versión 1.0.0</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#1B4F72', // Tu azul oscuro
  },
  container: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: '180%',
    height: '320%',
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    elevation: 5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F4F6F8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#1B4F72',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 1,
  },
  footerText: {
    marginTop: 30,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  }
});