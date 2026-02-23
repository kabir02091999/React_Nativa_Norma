import * as SQLite from 'expo-sqlite'; 
import { Alert } from 'react-native';

const TASA_IVA = 0.16;

let db = null; 

export const initDatabase = async () => {
    try {
        db = await SQLite.openDatabaseAsync('db.db'); 
        
        await db.execAsync(`

            CREATE TABLE IF NOT EXISTS locales (
                id INTEGER PRIMARY KEY NOT NULL, 
                ci_rif TEXT NOT NULL UNIQUE, 
                tipo_local TEXT, 
                nombre_local TEXT, 
                ubicacion_texto TEXT, 
                lat REAL NOT NULL, 
                lon REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY NOT NULL, 
                nombre TEXT NOT NULL UNIQUE, 
                stock_actual INTEGER NOT NULL, 
                precio_venta REAL 
            );
            
            CREATE TABLE IF NOT EXISTS facturas (
                id INTEGER PRIMARY KEY NOT NULL, 
                
                local_id INTEGER NOT NULL, 
                
                fecha_factura TEXT NOT NULL, 
                total_neto REAL,
                total_bruto REAL,
                
                FOREIGN KEY (local_id) REFERENCES locales(id)
                    ON DELETE CASCADE 
                    ON UPDATE CASCADE
            );


            
            
            CREATE TABLE IF NOT EXISTS facturacion_productos (
                id INTEGER PRIMARY KEY NOT NULL, 
                factura_id INTEGER NOT NULL, 
                
                producto_id INTEGER NOT NULL, -- ¡Ahora esta línea se creará correctamente!
                
                cantidad INTEGER NOT NULL,
                precio_unitario REAL,

                FOREIGN KEY (factura_id) REFERENCES facturas(id)
                    ON DELETE CASCADE 
                    ON UPDATE CASCADE,
                    
                FOREIGN KEY (producto_id) REFERENCES productos(id)
                    ON DELETE RESTRICT 
                    ON UPDATE CASCADE
            );
        `);
        
        console.log("Base de datos, y todas las tablas ('locales', 'productos', 'facturas', 'facturacion_productos') inicializadas con éxito.");
        return true;
        
    } catch (error) {
        console.error("Error al inicializar la BD:", error);
        throw error; 
    }
};
/* --DROP TABLE IF EXISTS facturacion_productos;  */
export const insertLocal = async (localData) => {
    if (!db) {
        throw new Error("La BD no está inicializada. Por favor, reinicia la aplicación.");
    }
    
    const { ciRif, tipoLocal, nombreLocal, ubicacionTexto, location } = localData;
    
    try {
        const result = await db.runAsync(
            `INSERT INTO locales (ci_rif, tipo_local, nombre_local, ubicacion_texto, lat, lon) VALUES (?, ?, ?, ?, ?, ?);`,
            [
                ciRif,
                tipoLocal,
                nombreLocal,
                ubicacionTexto,
                location.latitude,
                location.longitude,
            ]
        );
        
        console.log(`Local '${nombreLocal}' insertado con ID: ${result.lastInsertRowId}`);
        return result.lastInsertRowId;

    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            throw new Error(`El C.I./RIF '${ciRif}' ya existe en la base de datos.`);
        } else {
            throw error;
        }
    }
};

export const insertProducto = async (productoData) => {
    if (!db) {
        throw new Error("La BD no está inicializada.");
    }
    const { nombre, stockActual, precioVenta } = productoData;
    
    try {
        const result = await db.runAsync(
            `INSERT INTO productos (nombre, stock_actual, precio_venta) VALUES (?, ?, ?);`,
            [nombre, stockActual, precioVenta]
        );
        
        console.log(`Producto '${nombre}' insertado con ID: ${result.lastInsertRowId}`);
        return result.lastInsertRowId;

    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            throw new Error(`El producto '${nombre}' ya existe en la base de datos.`);
        } else {
            throw error;
        }
    }
};

export const GetAllProductos = async () => {
    if (!db) {
        throw new Error("La BD no está inicializada.");
    }
    try {
        const productos = await db.getAllAsync(
            `SELECT id, nombre, stock_actual, precio_venta FROM productos;`
        );
        return productos;
    } catch (error) {
        console.error('Error al consultar productos:', error);
        throw error;
    }
};

export const GetAllProductosBySearch = async (searchText) => {
    if (!db) {
        throw new Error("La BD no está inicializada.");
    }
    const searchPattern = `%${searchText}%`; 
    try {
        const productos = await db.getAllAsync(
            `SELECT id, nombre, stock_actual, precio_venta 
             FROM productos 
             WHERE nombre LIKE ? 
             LIMIT 10;`, // Limitamos a 10 sugerencias para rendimiento
            [searchPattern]
        );
        return productos;
    } catch (error) {
        console.error('Error al consultar productos por búsqueda:', error);
        throw error;
    }
};


export const crearOActualizarProducto = async (nombreProducto, cantidad, precioVenta) => {
    if (!db) {
        throw new Error("La BD no está inicializada.");
    }

    // 1. INTENTAR BUSCAR EL PRODUCTO POR NOMBRE
    // Usamos getFirstAsync porque esperamos 0 o 1 resultado.
    const existingProduct = await db.getFirstAsync(
        `SELECT id, stock_actual FROM productos WHERE nombre = ?;`,
        [nombreProducto]
    );

    try {
        if (existingProduct) {
            // 2. A) SI EXISTE: ACTUALIZAR STOCK
            const nuevoStock = existingProduct.stock_actual + cantidad;
            
            await db.runAsync(
                `UPDATE productos 
                 SET stock_actual = ?, 
                     precio_venta = ? 
                 WHERE id = ?;`,
                [nuevoStock, precioVenta, existingProduct.id]
            );
            
            return { 
                id: existingProduct.id, 
                accion: 'ACTUALIZADO', 
                stock: nuevoStock 
            };

        } else {
            // 2. B) SI NO EXISTE: CREAR NUEVO PRODUCTO
            // Insertamos el nuevo producto, usando la 'cantidad' como el stock inicial
            const result = await db.runAsync(
                `INSERT INTO productos (nombre, stock_actual, precio_venta) 
                 VALUES (?, ?, ?);`,
                [nombreProducto, cantidad, precioVenta]
            );

            return { 
                id: result.lastInsertRowId, 
                accion: 'CREADO', 
                stock: cantidad 
            };
        }
    } catch (error) {
        console.error(`Error al crear/actualizar el producto ${nombreProducto}:`, error);
        throw error;
    }
};


export const fetchLocales = async () => {
    if (!db) {
        throw new Error("La BD no está inicializada.");
    }
    
    try {
        const locales = await db.getAllAsync('SELECT * FROM locales');
        return locales;
    } catch (error) {
        console.error('Error al consultar locales:', error);
        throw error;
    }
};

export const clearLocal = async (idToDelete) => {
    if (!db) {
        throw new Error("La BD no está inicializada.");
    }
    try {
        // Aseguramos que el ID es un número, asumiendo que el parámetro es un ID
        const localId = Number(idToDelete); 
        await db.runAsync('DELETE FROM locales WHERE id = ?;', [localId]);
        console.log(`Local con ID ${localId} eliminado.`);
    } catch (error) {
        console.error(`Error al eliminar local con ID ${idToDelete}:`, error);
        throw error;
    }
};

/**
 * Función ÚNICA para buscar un local por su ID, asegurando la conversión a Número.
 */
export const fetchLocalById = async (id) => {
    if (!db) {
        throw new Error("La BD no está inicializada.");
    }
    console.log("fetchLocalById llamado con ID:", id);
    // CONVERTIMOS A NÚMERO, ya que la columna ID es INTEGER.
    const localId =  Number(id); 
    console.log("fetchLocalById recibido ID:", id, "convertido a Número:", localId);
    try {
        const local = await db.getFirstAsync(
            `SELECT * FROM locales WHERE id = ?`,
            [localId]
        );
        
        return local; // Retorna el objeto o null si no lo encuentra.
        
    } catch (error) {
        console.error(`Error al buscar local con ID ${localId}:`, error);
        throw error;
    }
};

export const searchLocales = async (searchTerm) => {
    if (!db) {
        throw new Error("La BD no está inicializada.");
    }
    
    const searchPattern = `%${searchTerm}%`;

    try {
        const locales = await db.getAllAsync(
            `
            SELECT * FROM locales 
            WHERE 
                nombre_local LIKE ? 
                OR ci_rif LIKE ? 
                OR ubicacion_texto LIKE ?
            `,
            [searchPattern, searchPattern, searchPattern] 
        );
        
        console.log(`Búsqueda de '${searchTerm}' encontró ${locales.length} resultados.`);
        return locales;
        
    } catch (error) {
        console.error('Error al realizar la búsqueda de locales:', error);
        throw error;
    }
};

export async function CrearFactura(localId, productosParaFacturar) {
    if (!db) {
        throw new Error("La base de datos no está inicializada.");
    }
    if (!productosParaFacturar || productosParaFacturar.length === 0) {
        throw new Error("La lista de productos para facturar está vacía.");
    }

    // 1. CÁLCULOS PRELIMINARES
    let subtotal = 0;
    
    for (const producto of productosParaFacturar) {
        const precio = producto.precio_venta || 0;
        const cantidad = producto.cantidadSeleccionada || 0;
        subtotal += precio * cantidad;
    }

    const impuesto = subtotal * TASA_IVA;
    const totalBruto = subtotal + impuesto;
    const fechaActual = new Date().toISOString(); // Formato TEXT ISO 8601

    let newFacturaId = null;

    // 2. INICIAR TRANSACCIÓN (Asegura atomicidad: todo se guarda o nada se guarda)
    try {
        await db.withTransactionAsync(async () => {
            
            // A. INSERTAR EN LA TABLA `facturas` (Cabecera)
            const facturaResult = await db.runAsync(
                `INSERT INTO facturas 
                (local_id, fecha_factura, total_neto, total_bruto) 
                VALUES (?, ?, ?, ?)`,
                [localId, fechaActual, subtotal, totalBruto]
            );
            
            newFacturaId = facturaResult.lastInsertRowId;

            // B. PROCESAR PRODUCTOS, INSERTAR DETALLE Y ACTUALIZAR STOCK
            for (const producto of productosParaFacturar) {
                const producto_id = producto.id;
                const cantidad_vendida = producto.cantidadSeleccionada;
                const precio_unitario = producto.precio_venta;
                const stock_actual = producto.stock_actual;

                // 1. Insertar el detalle del producto en `facturacion_productos`
                await db.runAsync(
                    `INSERT INTO facturacion_productos 
                    (factura_id, producto_id, cantidad, precio_unitario) 
                    VALUES (?, ?, ?, ?)`,
                    [newFacturaId, producto_id, cantidad_vendida, precio_unitario]
                );

                // 2. Actualizar el stock en la tabla `productos`
                const nuevo_stock = stock_actual - cantidad_vendida;
                
                // Si llegamos a este punto, la validación debería haber prevenido stock < 0,
                // pero lo mantenemos como un seguro dentro de la transacción.
                if (nuevo_stock < 0) {
                    throw new Error(`Stock insuficiente para el producto ID ${producto_id}.`);
                }

                await db.runAsync(
                    `UPDATE productos 
                    SET stock_actual = ? 
                    WHERE id = ?`,
                    [nuevo_stock, producto_id]
                );
            }
        }); // Fin de db.withTransactionAsync

        // Si la transacción fue exitosa:
        return {
            facturaId: newFacturaId,
            totalBruto: totalBruto
        };

    } catch (error) {
        // La transacción se revierte automáticamente si ocurre un error
        console.error("Transacción de Facturación Fallida:", error);
        throw new Error(`Error al procesar la factura: ${error.message}`);
    }
}

export async function GetFacturasDelDia() {
    if (!db) {
        throw new Error("La base de datos no está inicializada.");
    }
    
    // 1. Obtener la fecha actual en formato de texto YYYY-MM-DD.
    // Usamos el formato ISO 8601 que incluye la hora (e.g., "2025-12-06T10:00:00.000Z"),
    // pero luego usamos la función DATE() de SQLite para compararla solo por el día.
    const todayISO = new Date().toISOString(); 
    
    // 2. Ejecutar la consulta SQL.
    try {
        // SELECT * FROM facturas
        // WHERE DATE(fecha_factura) = DATE('YYYY-MM-DDTHH:MM:SS.sssZ')
        // SQLite usa DATE() para extraer solo la parte de la fecha (YYYY-MM-DD) de un texto ISO.
        const facturas = await db.getAllAsync(
            `SELECT 
                f.*, 
                l.nombre_local 
            FROM facturas f
            JOIN locales l ON f.local_id = l.id
            WHERE DATE(f.fecha_factura) = DATE(?)
            ORDER BY f.id DESC`,
            [todayISO] // SQLite calculará DATE(todayISO) para obtener 'YYYY-MM-DD'
        );
        
        console.log(`Se encontraron ${facturas.length} facturas para hoy.`);
        return facturas;

    } catch (error) {
        console.error("Error al obtener las facturas del día:", error);
        throw new Error("No se pudieron consultar las facturas del día.");
    }
}

export async function GetProductosDeFactura(facturaId) {
    if (!db) {
        throw new Error("La base de datos no está inicializada.");
    }
    
    try {
        const productosDetalle = await db.getAllAsync(
            `SELECT 
                fp.cantidad,
                fp.precio_unitario,
                p.nombre AS nombre_producto,
                p.precio_venta AS precio_actual_producto
            FROM facturacion_productos fp
            JOIN productos p ON fp.producto_id = p.id
            WHERE fp.factura_id = ?`,
            [facturaId]
        );
        
        return productosDetalle;

    } catch (error) {
        console.error(`Error al obtener productos para la factura ${facturaId}:`, error);
        throw new Error("No se pudieron consultar los detalles de los productos de la factura.");
    }
}

export async function GetFacturasPorLocal(localId) {
    if (!db) {
        throw new Error("La base de datos no está inicializada.");
    }
    
    try {
        // Consulta simple a la tabla facturas filtrando por local_id
        const facturas = await db.getAllAsync(
            `SELECT 
                id, 
                fecha_factura, 
                total_neto, 
                total_bruto
            FROM facturas
            WHERE local_id = ?
            ORDER BY fecha_factura DESC`,
            [localId]
        );
        
        return facturas;

    } catch (error) {
        console.error(`Error al obtener facturas para el local ${localId}:`, error);
        throw new Error("No se pudieron consultar las facturas del local.");
    }
}