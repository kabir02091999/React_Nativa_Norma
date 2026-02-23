import React, { useEffect, useState, useCallback, useRef } from "react";
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    Alert, ActivityIndicator, SafeAreaView 
} from "react-native";
import { useLocalSearchParams, useFocusEffect, useRouter } from "expo-router"; 
import { GetInventarioProductos, DeleteRuta, PostCrearPreVenta } from "../../api/api.js"; 

import * as SecureStore from 'expo-secure-store';

/* ojo con una animacion en rojo los campos obligatorios */
const ProductoCard = React.memo(({ item, onQuantityChange }) => {
    return (
        <View style={styles.card}>
            <View style={styles.infoContainer}>
                <Text style={styles.nombre}>{item.nombre}</Text>
                <Text style={styles.detail}>Código: {item.codigo} | {item.Tamano}</Text>
                <Text style={styles.detail}>Stock Disponible: {item.stock_actual}</Text>
                <Text style={styles.price}>Precio: ${item.precio_venta?.toFixed(2)}</Text>
            </View>
            
            <View style={styles.controls}>
                <TouchableOpacity 
                    style={styles.controlButton}
                    onPress={() => onQuantityChange(item.id, item.cantidadSeleccionada - 1)}
                >
                    <Text style={styles.buttonText}>-</Text>
                </TouchableOpacity>

                <View style={styles.quantityDisplay}>
                    <Text style={styles.quantityText}>{item.cantidadSeleccionada}</Text>
                </View>

                <TouchableOpacity 
                    style={styles.controlButton}
                    onPress={() => onQuantityChange(item.id, item.cantidadSeleccionada + 1)}
                >
                    <Text style={styles.buttonText}>+</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
});

export default function DetalleLocal() {
    const { IDLocal } = useLocalSearchParams();
    const router = useRouter(); 
    const [productos, setProductos] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Referencia para mantener el estado actual de los productos y no perder datos en el setInterval
    const productosRef = useRef(productos);
    useEffect(() => { productosRef.current = productos; }, [productos]);

    // 1. Cargar inventario desde el backend
    const fetchProductos = useCallback(async (isSilent = false) => {
        // Solo mostramos el cargando la primera vez, no cada 30 segundos
        if (!isSilent) setIsLoading(true);
        
        try {
            const data = await GetInventarioProductos();
            const productosNormalizados = data.map(p => {
                // Buscamos si el vendedor ya tenía algo seleccionado de este producto
                const previo = productosRef.current.find(prev => prev.id === p.ID_Producto);
                
                return {
                    id: p.ID_Producto,
                    nombre: p.Descricion,
                    codigo: p.codigo,
                    Tamano: p.Tamano,
                    stock_actual: p.cantidad,
                    precio_venta: p.precio,
                    // Si ya tenía algo seleccionado, lo mantenemos; si no, 0
                    cantidadSeleccionada: previo ? previo.cantidadSeleccionada : 0, 
                };
            });
            setProductos(productosNormalizados);
        } catch (error) {
            console.error("Error al sincronizar inventario:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Se ejecuta al entrar a la pantalla
    useFocusEffect(
        useCallback(() => {
            fetchProductos();
        }, [fetchProductos])
    );

    // --- AQUÍ ESTÁ EL RELOJ DE 30 SEGUNDOS ---
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isProcessing) { // No actualizar si se está enviando la venta
                fetchProductos(true); // true para que sea una carga silenciosa
            }
        }, 30000); // 30 segundos

        return () => clearInterval(interval); // Limpiar al salir
    }, [fetchProductos, isProcessing]);

    // 2. Manejar cambio de cantidades
    const handleQuantityChange = useCallback((productId, newQuantity) => {
        setProductos(prevProductos => {
            return prevProductos.map(p => {
                if (p.id === productId) {
                    if (newQuantity > p.stock_actual) {
                        Alert.alert("Límite de Stock", `Solo hay ${p.stock_actual} disponibles.`);
                        return p; 
                    }
                    if (newQuantity < 0) return p; 
                    return { ...p, cantidadSeleccionada: newQuantity };
                }
                return p;
            });
        });
    }, []);

    // 3. ENVIAR PRE-VENTA AL BACKEND
    const handleConfirmarVenta = async () => {
        const seleccionados = productos.filter(p => p.cantidadSeleccionada > 0);
        
        if (seleccionados.length === 0) {
            Alert.alert("Carrito Vacío", "Selecciona al menos un producto.");
            return;
        }

        setIsProcessing(true);
        try {
            const ventaData = {
                ID_Clientes_Status: Number(IDLocal),
                ID_Usuario: 1, 
                productos: seleccionados.map(p => ({
                    ID_Producto: p.id,
                    cantidad_pedido: p.cantidadSeleccionada
                }))
            };

            const resultado = await PostCrearPreVenta(ventaData);

            if (resultado.ok) {
                try {
                    await DeleteRuta(IDLocal);
                } catch (errorRuta) {
                    console.error("Error al limpiar ruta:", errorRuta);
                }

                Alert.alert(
                    "¡Venta Exitosa! 🎉", 
                    `Pre-venta registrada correctamente.`,
                    [{ text: "OK", onPress: () => router.replace("/") }] 
                );
            }
        } catch (error) {
            Alert.alert("Error en la Venta", error.message);
            // Si hay error de stock, refrescamos el inventario inmediatamente
            fetchProductos(true);
        } finally {
            setIsProcessing(false);
        }
    };

    const totalVenta = productos.reduce((acc, p) => acc + (p.cantidadSeleccionada * p.precio_venta), 0);

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Sincronizando productos...</Text>
            </View>
        );
    }
    
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Nueva Pre-Venta</Text>
                <Text style={styles.headerSubtitle}>ID Local: {IDLocal}</Text>
            </View>
            
            <FlatList
                data={productos}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                    <ProductoCard 
                        item={item} 
                        onQuantityChange={handleQuantityChange} 
                    />
                )}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={() => (
                    <Text style={styles.emptyText}>No hay productos en inventario.</Text>
                )}
            />
            
            <View style={styles.footer}>
                <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total a Cobrar:</Text>
                    <Text style={styles.totalAmount}>${totalVenta.toFixed(2)}</Text>
                </View>
                
                <TouchableOpacity 
                    style={[styles.confirmButton, (isProcessing || totalVenta === 0) && styles.disabledButton]} 
                    onPress={handleConfirmarVenta}
                    disabled={isProcessing || totalVenta === 0}
                >
                    {isProcessing ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.confirmButtonText}>CONFIRMAR VENTA</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    headerSubtitle: { fontSize: 14, color: '#666' },
    listContent: { padding: 15, paddingBottom: 120 },
    card: { 
        flexDirection: 'row', 
        backgroundColor: '#fff', 
        padding: 15, 
        borderRadius: 12, 
        marginBottom: 12, 
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 }
    },
    infoContainer: { flex: 2 },
    nombre: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
    detail: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
    price: { fontSize: 15, fontWeight: 'bold', color: '#27ae60', marginTop: 6 },
    controls: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
    controlButton: { backgroundColor: '#f0f2f5', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    buttonText: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
    quantityDisplay: { width: 40, alignItems: 'center' },
    quantityText: { fontSize: 18, fontWeight: 'bold' },
    footer: { 
        position: 'absolute', bottom: 0, left: 0, right: 0, 
        backgroundColor: '#fff', padding: 20, 
        borderTopWidth: 1, borderTopColor: '#eee',
        elevation: 10
    },
    totalContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' },
    totalLabel: { fontSize: 16, color: '#666' },
    totalAmount: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    confirmButton: { backgroundColor: '#4CD964', padding: 18, borderRadius: 12, alignItems: 'center' },
    disabledButton: { backgroundColor: '#ccc' },
    confirmButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    loadingText: { marginTop: 10, color: '#666' },
    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});