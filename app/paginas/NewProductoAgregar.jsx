import React, { useState, useCallback } from 'react';
import { 
    View, 
    Button, 
    TextInput, 
    Alert, 
    Text, 
    StyleSheet, 
    ActivityIndicator,
    FlatList, 
    TouchableOpacity 
} from 'react-native';
import { crearOActualizarProducto, GetAllProductosBySearch } from '../../utils/db'; 

const DEBOUNCE_DELAY = 300; 

export default function NewProductoAgregar() {
    const [nombre, setNombre] = useState('');
    const [cantidad, setCantidad] = useState('');
    const [precio, setPrecio] = useState('');
    const [cargando, setCargando] = useState(false);
    const [suggestions, setSuggestions] = useState([]); 
    const [typingTimer, setTypingTimer] = useState(null); 

    const fetchSuggestions = useCallback(async (text) => {
        if (text.length > 1) { 
            try {
                const results = await GetAllProductosBySearch(text);
                setSuggestions(results);
            } catch (error) {
                console.error("Error buscando sugerencias:", error);
                setSuggestions([]);
            }
        } else {
            setSuggestions([]); 
        }
    }, []);

    const handleNombreChange = (text) => {
        setNombre(text);
        
        if (typingTimer) {
            clearTimeout(typingTimer);
        }
        
        const newTimer = setTimeout(() => {
            fetchSuggestions(text);
        }, DEBOUNCE_DELAY);
        
        setTypingTimer(newTimer);
    };

    const handleSelectSuggestion = (product) => {
        setNombre(product.nombre);
        
        if (product.precio_venta) {
            setPrecio(String(product.precio_venta));
        }
        setSuggestions([]); 
    };


    const handleGuardarProducto = async () => {
        const cantidadNum = parseInt(cantidad);
        const precioNum = parseFloat(precio);

        if (!nombre || isNaN(cantidadNum) || cantidadNum <= 0 || isNaN(precioNum)) {
            Alert.alert("Error de Entrada", "Por favor, ingresa un nombre, una cantidad mayor a cero y un precio válido.");
            return;
        }

        setCargando(true);
        try {
            const resultado = await crearOActualizarProducto(
                nombre.trim(), 
                cantidadNum, 
                precioNum
            );
            
            const mensaje = resultado.accion === 'CREADO'
                ? `Producto nuevo creado con ID ${resultado.id}. Stock inicial: ${resultado.stock}`
                : `Stock actualizado con ID ${resultado.id}. Cantidad sumada: ${cantidadNum}. Nuevo Stock Total: ${resultado.stock}`;

            Alert.alert(
                `Operación Exitosa: ${resultado.accion}`,
                `Producto: ${nombre}\n${mensaje}`
            );
            
            setNombre('');
            setCantidad('');
            setPrecio('');

        } catch (error) {
            console.error('Error al gestionar el producto:', error);
            Alert.alert("Error del Sistema", "Hubo un problema al interactuar con la base de datos.");
        } finally {
            setCargando(false);
        }
    };
    

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Inventario: Añadir o Actualizar Stock</Text>
            
            <View style={[styles.autocompleteContainer, styles.spacing]}>
                <TextInput
                    style={styles.input}
                    placeholder="Nombre del Producto (Busca o Crea)"
                    value={nombre}
                    onChangeText={handleNombreChange} 
                />

                {suggestions.length > 0 && (
                    <FlatList
                        data={suggestions}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={({ item }) => (
                            <TouchableOpacity 
                                style={styles.suggestionItem}
                                onPress={() => handleSelectSuggestion(item)}
                            >
                                <Text style={styles.suggestionText}>{item.nombre} (Stock: {item.stock_actual})</Text>
                            </TouchableOpacity>
                        )}
                        style={styles.suggestionsList}
                    />
                )}
            </View>
            
            <TextInput
                style={[styles.input, styles.spacing]}
                placeholder="Cantidad a Añadir"
                value={cantidad}
                onChangeText={setCantidad}
                keyboardType="numeric"
            />
            
            <TextInput
                style={[styles.input, styles.spacing]}
                placeholder="Precio de Venta"
                value={precio}
                onChangeText={setPrecio}
                keyboardType="numeric"
            />
            
            <Button
                title={cargando ? "Procesando..." : "Guardar Producto / Añadir Stock"}
                onPress={handleGuardarProducto}
                disabled={cargando}
                color="#007AFF"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1,
        padding: 20,
        backgroundColor: '#f9f9f9'
    },
    header: { 
        fontSize: 20, 
        marginBottom: 25, 
        fontWeight: 'bold', 
        textAlign: 'center' 
    },
    spacing: {
        marginBottom: 15,
    },
    autocompleteContainer: {
        zIndex: 10,
    },
    input: { 
        height: 50, 
        borderColor: '#ccc', 
        borderWidth: 1, 
        borderRadius: 8,
        paddingHorizontal: 15,
        backgroundColor: '#fff',
    },
    suggestionsList: {
        maxHeight: 200, 
        borderColor: '#ccc',
        borderWidth: 1,
        borderTopWidth: 0,
        backgroundColor: '#fff',
        position: 'absolute',
        top: 50, 
        left: 0,
        right: 0,
        zIndex: 10,
        borderRadius: 8,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    suggestionItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    suggestionText: {
        fontSize: 16,
    }
});