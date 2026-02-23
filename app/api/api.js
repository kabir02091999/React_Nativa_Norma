import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
/* const api = axios.create({
    
    baseURL: 'http://192.168.0.176:3000/api', 
    timeout: 5000, // Si tarda más de 5s, cancela
    headers: {
        'Content-Type': 'application/json'
    }
}); */


/* import axios from 'axios'; */

// Configuración de la IP de tu PC (no uses localhost)
const api = axios.create({
    baseURL: 'http://192.168.0.176:3000/api', // Cambia esta IP por la de tu máquina
    timeout: 5000,
});

export const searchLocales = async (clave) => {
    try {
        const response = await api.get(`/vendedor/ubicacion/buscar/${clave}`);
        return response.data; 
    } catch (error) {
        // 🚨 ESTO ES CLAVE: Mira la consola de VSCode/Expo cuando busques
        if (error.code === 'ECONNABORTED') {
            console.error("ERROR: El servidor tardó mucho (Timeout)");
        } else if (!error.response) {
            console.error("ERROR: No hubo respuesta del servidor. Revisa Firewall/IP.");
        } else {
            console.error("ERROR STATUS:", error.response.status);
        }
        
        if (error.response && error.response.status === 404) return [];
        throw new Error("Error al conectar");
    }
};

export const fetchLocalById = async (id) => {
    try {
        // Usamos la ruta que definiste en tu backend: /api/vendedor/cliente/:id
        const response = await api.get(`/vendedor/cliente/${id}`);
        
        console.log("Respuesta del servidor para ID", id, ":", response.data); 
        return response.data; 
    } catch (error) {
        console.error("Error al obtener detalle del cliente:", error.message);
        throw error;
    }
};

// Obtener el historial de facturas del cliente
export const GetFacturasPorLocal = async (idLocal) => {
    try {
        const response = await api.get(`/vendedor/facturas/cliente/${idLocal}`);
        return response.data;
    } catch (error) {
        console.log("Facturas no encontradas o ruta no implementada, devolviendo array vacío.");
        return []; 
    }
};

export const getUbicacionClienteById = async (id) => {
    try {
        const response = await api.get(`/vendedor/ubicacion/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener ubicación del cliente:", error.message);
        throw error;
    }
};

export const insertClienteStatus = async (clienteData) => {
    try {
        const response = await api.post('/vendedor/cliente_status', clienteData);
        return response.data;
    } catch (error) {
        console.error("Error al insertar cliente status:", error.response?.data || error.message);
        throw error;
    }
};

export const postGenerarRuta = async (data) => {
    console.log("Enviando datos para generar ruta:", data); 
    try {
        
        const response = await api.post('/vendedor/rutas', data); 
        return response.data; 
    } catch (error) {
        if (error.response) {
            
            return error.response.data; 
        }
        return { ok: false, message: "Error de conexión con el servidor" };
    }
};

export const  fetchRutaVendedor = async (id) => {
    console.log("Obteniendo ruta para vendedor ID:", id);
    
    try {
        const response = await api.get(`/vendedor/rutas/${id}`);
        return response.data;
    } catch (error) {
        console.error("Error al obtener ruta del vendedor:", error.message);
        throw error;
    }
};

export const PostNuevaObservacion = async (observacionData) => {
    try {
        const response = await api.post('/vendedor/crear-observacion', observacionData);
        return response.data;
    } catch (error) {
        console.error("Error al insertar nueva observación:", error.response?.data || error.message);
        throw error;
    }
};

export const DeleteRuta = async (id) => {
    try {
        const response = await api.delete(`/vendedor/rutas/${id}`); 
        return response.data;
    } catch (error) {
        //console.error("Error al eliminar ruta:", error.response?.data || error.message);
        //throw error;  //ojo aqui no manda erro por que hay dos evento donde se llama a esta funcion, uno es el de eliminar ruta y otro es el de eliminar ruta al generar una nueva, en este ultimo caso no es un error que no se encuentre la ruta por que se esta eliminando la ruta anterior para generar una nueva, por eso se comenta el error y se devuelve un mensaje de éxito aunque no se encuentre la ruta
        return { ok: true, message: "Ruta eliminada o no encontrada (si estabas generando una nueva ruta, esto es normal)" };
    }
};

export const GetInventarioProductos = async () => {
    try {
        const response = await api.get('/vendedor/inventario');
        return response.data;
    } catch (error) {
        console.error("Error al obtener inventario de productos:", error.message);
        throw error;
    }
};

export const PostCrearPreVenta = async (ventaData) => {
    
    console.log("Enviando datos para crear pre-venta:", ventaData);
    
    try {
        const response = await api.post('/vendedor/venta', ventaData); 
        return response.data;
    } catch (error) {
        // Extraemos el mensaje de error personalizado del backend (ej: "No hay suficiente stock")
        const errorMsg = error.response?.data?.errorDetalle || error.response?.data?.message || error.message;
        throw new Error(errorMsg);
    }
};

// INTERCEPTOR: Esto pega el token en cada llamada que hagas
api.interceptors.request.use(
    async (config) => {
        const token = await SecureStore.getItemAsync('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Agrega esta función de login al final de tus exportaciones:
export const loginUsuario = async (nombre, clave) => {
    try {
        // Ajustamos la ruta para que coincida con tu backend
        const response = await api.post('/usuarios/login', { Nombre: nombre, clave: clave });
        console.log("Respuesta del servidor en login:", response.data);
        return response.data; 
    } catch (error) {
        console.error("Error en login:", error.response?.data || error.message);
        throw error;
    }
};

export default api;