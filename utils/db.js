import * as SQLite from 'expo-sqlite';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import XLSX from 'xlsx';
import { Buffer } from 'buffer'
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

const TASA_IVA = 0.16;

let db = null;
let _initPromise = null;

export const initDatabase = async () => {
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
        try {
            db = await SQLite.openDatabaseAsync('db.db');

            await db.withTransactionAsync(async () => {
                // Tabla locales (versión unificada después de migración)
                await db.runAsync(
                    `CREATE TABLE IF NOT EXISTS locales (
                        id                     INTEGER PRIMARY KEY AUTOINCREMENT,
                        rif_ci                 TEXT NOT NULL UNIQUE,
                        tipos_cliente          TEXT,
                        razon_social           TEXT,
                        direccion_fiscal       TEXT,
                        contribuyente_especial TEXT,
                        punto_referencia       TEXT,
                        telefono_principal     TEXT,
                        gps_latitud            REAL,
                        gps_longitud           REAL
                    )`
                );

                await db.runAsync(
                    `CREATE TABLE IF NOT EXISTS productos (
                        id           INTEGER PRIMARY KEY NOT NULL,
                        nombre       TEXT NOT NULL UNIQUE,
                        stock_actual INTEGER NOT NULL,
                        precio_venta REAL
                    )`
                );

                await db.runAsync(
                    `CREATE TABLE IF NOT EXISTS facturas (
                        id            INTEGER PRIMARY KEY NOT NULL,
                        local_id      INTEGER NOT NULL,
                        fecha_factura TEXT NOT NULL,
                        total_neto    REAL,
                        total_bruto   REAL,
                        FOREIGN KEY (local_id) REFERENCES locales(id)
                            ON DELETE CASCADE ON UPDATE CASCADE
                    )`
                );

                await db.runAsync(
                    `CREATE TABLE IF NOT EXISTS facturacion_productos (
                        id              INTEGER PRIMARY KEY NOT NULL,
                        factura_id      INTEGER NOT NULL,
                        producto_id     INTEGER NOT NULL,
                        cantidad        INTEGER NOT NULL,
                        precio_unitario REAL,
                        FOREIGN KEY (factura_id)  REFERENCES facturas(id)
                            ON DELETE CASCADE ON UPDATE CASCADE,
                        FOREIGN KEY (producto_id) REFERENCES productos(id)
                            ON DELETE RESTRICT ON UPDATE CASCADE
                    )`
                );

                await db.runAsync(
                    `CREATE TABLE IF NOT EXISTS censo_local (
                        id                     INTEGER PRIMARY KEY AUTOINCREMENT,
                        razon_social           TEXT,
                        nombre_fantasia        TEXT,
                        rif                    TEXT UNIQUE,
                        segmento               TEXT,
                        categoria_oportunidad  TEXT,
                        tamano_cliente         TEXT,
                        sector                 TEXT,
                        ciudad                 TEXT,
                        direccion_fiscal       TEXT,
                        direccion_fisica       TEXT,
                        persona_contacto       TEXT,
                        telefono               TEXT,
                        whatsapp               TEXT,
                        correo_electronico     TEXT,
                        telefono_compras       TEXT,
                        correo_representante   TEXT,
                        compra_promedio        REAL,
                        donde_recibe           TEXT,
                        frecuencia_visita      TEXT,
                        dia_visita             TEXT,
                        horario_visita         TEXT,
                        dia_despacho           TEXT,
                        horario_entrega        TEXT,
                        lat                    REAL,
                        lng                    REAL,
                        status                 INTEGER,
                        contribuyente_especial INTEGER,
                        municipio              TEXT,
                        estado                 TEXT,
                        punto_referencia       TEXT,
                        representante_legal    TEXT,
                        rif_representante      TEXT,
                        correo_administracion  TEXT,
                        contacto_administracion TEXT,
                        telefono_administracion TEXT,
                        metodo_pago            TEXT,
                        observaciones          TEXT,
                        productos_json         TEXT,
                        fecha_registro         TEXT
                    )`
                );

                await db.runAsync(
                    `CREATE TABLE IF NOT EXISTS ruta_activa (
                        id           INTEGER PRIMARY KEY AUTOINCREMENT,
                        posicion     INTEGER NOT NULL,
                        nombre       TEXT,
                        categoria    TEXT,
                        direccion    TEXT,
                        telefono     TEXT,
                        lat          REAL,
                        lon          REAL,
                        distancia_km REAL
                    )`
                );

                // ‼️ NUEVA TABLA: VENTAS ‼️
                await db.runAsync(
                    `CREATE TABLE IF NOT EXISTS ventas (
                        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
                        local_id             INTEGER,
                        razon_social         TEXT,
                        rif_ci               TEXT,
                        contribuyente        TEXT,
                        tipo_documento       TEXT,
                        tipo_pago            TEXT,
                        dias_credito         INTEGER,
                        moneda               TEXT,
                        productos_json       TEXT,
                        subtotal             REAL,
                        iva                  REAL,
                        total                REAL,
                        fecha                TEXT
                    )`
                );

                

            });

            // Ejecutar migraciones para asegurar columnas actualizadas
            await migrarTablaLocal();
            await migrarCensoLocal();
            await migrarVentas();

            console.log("Base de datos inicializada completamente ✅");
            return true;

        } catch (error) {
            _initPromise = null;
            console.error("Error al inicializar la BD:", error);
            throw error;
        }
    })();

    return _initPromise;
};

// ─── FUNCIONES DE RUTA ACTIVA ─────────────────────────────────────────────────
export const getRutaActiva = async () => {
    if (!db) await initDatabase();
    try {
        const filas = await db.getAllAsync(
            `SELECT posicion, nombre, categoria, direccion, telefono, lat, lon, distancia_km
             FROM ruta_activa
             ORDER BY posicion ASC;`
        );
        return filas.map(f => ({
            Nombre: f.nombre,
            Categoria: f.categoria,
            Direccion: f.direccion,
            Telefono: f.telefono,
            Latitud: f.lat,
            Longitud: f.lon,
            distanciaCalculada: f.distancia_km != null ? String(f.distancia_km) : '0',
        }));
    } catch (error) {
        console.error("Error al leer ruta_activa:", error);
        return [];
    }
};

export const guardarRutaActiva = async (puntos) => {
    if (!db) await initDatabase();
    try {
        await db.withTransactionAsync(async () => {
            await db.runAsync(`DELETE FROM ruta_activa;`);
            for (let i = 0; i < puntos.length; i++) {
                const p = puntos[i];
                await db.runAsync(
                    `INSERT INTO ruta_activa (posicion, nombre, categoria, direccion, telefono, lat, lon, distancia_km)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
                    [
                        i,
                        p.Nombre ?? null,
                        p.Categoria ?? null,
                        p.Direccion ?? null,
                        p.Telefono ?? null,
                        parseFloat(p.Latitud) || null,
                        parseFloat(p.Longitud) || null,
                        parseFloat(p.distanciaCalculada) || null,
                    ]
                );
            }
        });
        console.log(`Ruta guardada con ${puntos.length} paradas ✅`);
    } catch (error) {
        console.error("Error al guardar ruta_activa:", error);
        throw error;
    }
};

export const limpiarRutaActiva = async () => {
    if (!db) await initDatabase();
    try {
        await db.runAsync(`DELETE FROM ruta_activa;`);
        console.log("Ruta activa borrada ✅");
    } catch (error) {
        console.error("Error al limpiar ruta_activa:", error);
        throw error;
    }
};

// ─── FUNCIONES DE PRODUCTOS Y LOCALES (existentes) ───────────────────────────
export const insertLocal = async (localData) => {
    if (!db) throw new Error("La BD no está inicializada.");
    const { ciRif, tipoLocal, nombreLocal, ubicacionTexto, location } = localData;
    try {
        const result = await db.runAsync(
            `INSERT INTO locales (rif_ci, tipos_cliente, razon_social, direccion_fiscal, gps_latitud, gps_longitud) 
             VALUES (?, ?, ?, ?, ?, ?);`,
            [ciRif, tipoLocal, nombreLocal, ubicacionTexto, location.latitude, location.longitude]
        );
        console.log(`Local '${nombreLocal}' insertado con ID: ${result.lastInsertRowId}`);
        return result.lastInsertRowId;
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            throw new Error(`El C.I./RIF '${ciRif}' ya existe.`);
        } else {
            throw error;
        }
    }
};

export const insertProducto = async (productoData) => {
    if (!db) throw new Error("La BD no está inicializada.");
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
            throw new Error(`El producto '${nombre}' ya existe.`);
        } else {
            throw error;
        }
    }
};

export const GetAllProductos = async () => {
    if (!db) throw new Error("La BD no está inicializada.");
    try {
        return await db.getAllAsync(`SELECT id, nombre, stock_actual, precio_venta FROM productos;`);
    } catch (error) {
        console.error('Error al consultar productos:', error);
        throw error;
    }
};

export const GetAllProductosBySearch = async (searchText) => {
    if (!db) throw new Error("La BD no está inicializada.");
    const searchPattern = `%${searchText}%`;
    try {
        return await db.getAllAsync(
            `SELECT id, nombre, stock_actual, precio_venta FROM productos WHERE nombre LIKE ? LIMIT 10;`,
            [searchPattern]
        );
    } catch (error) {
        console.error('Error al consultar productos por búsqueda:', error);
        throw error;
    }
};

export const crearOActualizarProducto = async (nombreProducto, cantidad, precioVenta) => {
    if (!db) throw new Error("La BD no está inicializada.");
    const existingProduct = await db.getFirstAsync(
        `SELECT id, stock_actual FROM productos WHERE nombre = ?;`,
        [nombreProducto]
    );
    try {
        if (existingProduct) {
            const nuevoStock = existingProduct.stock_actual + cantidad;
            await db.runAsync(
                `UPDATE productos SET stock_actual = ?, precio_venta = ? WHERE id = ?;`,
                [nuevoStock, precioVenta, existingProduct.id]
            );
            return { id: existingProduct.id, accion: 'ACTUALIZADO', stock: nuevoStock };
        } else {
            const result = await db.runAsync(
                `INSERT INTO productos (nombre, stock_actual, precio_venta) VALUES (?, ?, ?);`,
                [nombreProducto, cantidad, precioVenta]
            );
            return { id: result.lastInsertRowId, accion: 'CREADO', stock: cantidad };
        }
    } catch (error) {
        console.error(`Error al crear/actualizar el producto ${nombreProducto}:`, error);
        throw error;
    }
};

export const fetchLocales = async () => {
    if (!db) throw new Error("La BD no está inicializada.");
    try {
        return await db.getAllAsync('SELECT * FROM locales');
    } catch (error) {
        console.error('Error al consultar locales:', error);
        throw error;
    }
};

export const clearLocal = async (idToDelete) => {
    if (!db) throw new Error("La BD no está inicializada.");
    try {
        const localId = Number(idToDelete);
        await db.runAsync('DELETE FROM locales WHERE id = ?;', [localId]);
        console.log(`Local con ID ${localId} eliminado.`);
    } catch (error) {
        console.error(`Error al eliminar local con ID ${idToDelete}:`, error);
        throw error;
    }
};

export const fetchLocalById = async (id) => {
    if (!db) throw new Error("La BD no está inicializada.");
    const localId = Number(id);
    try {
        return await db.getFirstAsync(`SELECT * FROM locales WHERE id = ?`, [localId]);
    } catch (error) {
        console.error(`Error al buscar local con ID ${localId}:`, error);
        throw error;
    }
};

export const searchLocales = async (searchTerm) => {
    if (!db) throw new Error("La BD no está inicializada.");
    const searchPattern = `%${searchTerm}%`;
    try {
        return await db.getAllAsync(
            `SELECT * FROM locales WHERE razon_social LIKE ? OR rif_ci LIKE ? OR direccion_fiscal LIKE ?`,
            [searchPattern, searchPattern, searchPattern]
        );
    } catch (error) {
        console.error('Error al realizar la búsqueda de locales:', error);
        throw error;
    }
};

// ─── FACTURACIÓN ─────────────────────────────────────────────────────────────
export async function CrearFactura(localId, productosParaFacturar) {
    if (!db) throw new Error("La base de datos no está inicializada.");
    if (!productosParaFacturar || productosParaFacturar.length === 0) {
        throw new Error("La lista de productos para facturar está vacía.");
    }
    let subtotal = 0;
    for (const producto of productosParaFacturar) {
        subtotal += (producto.precio_venta || 0) * (producto.cantidadSeleccionada || 0);
    }
    const impuesto = subtotal * TASA_IVA;
    const totalBruto = subtotal + impuesto;
    const fechaActual = new Date().toISOString();
    let newFacturaId = null;
    try {
        await db.withTransactionAsync(async () => {
            const facturaResult = await db.runAsync(
                `INSERT INTO facturas (local_id, fecha_factura, total_neto, total_bruto) VALUES (?, ?, ?, ?)`,
                [localId, fechaActual, subtotal, totalBruto]
            );
            newFacturaId = facturaResult.lastInsertRowId;
            for (const producto of productosParaFacturar) {
                await db.runAsync(
                    `INSERT INTO facturacion_productos (factura_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)`,
                    [newFacturaId, producto.id, producto.cantidadSeleccionada, producto.precio_venta]
                );
                const nuevo_stock = producto.stock_actual - producto.cantidadSeleccionada;
                if (nuevo_stock < 0) throw new Error(`Stock insuficiente para el producto ID ${producto.id}.`);
                await db.runAsync(`UPDATE productos SET stock_actual = ? WHERE id = ?`, [nuevo_stock, producto.id]);
            }
        });
        return { facturaId: newFacturaId, totalBruto };
    } catch (error) {
        console.error("Transacción de Facturación Fallida:", error);
        throw new Error(`Error al procesar la factura: ${error.message}`);
    }
}

export async function GetFacturasDelDia() {
    if (!db) throw new Error("La base de datos no está inicializada.");
    const todayISO = new Date().toISOString();
    try {
        return await db.getAllAsync(
            `SELECT f.*, l.razon_social AS nombre_local FROM facturas f
             JOIN locales l ON f.local_id = l.id
             WHERE DATE(f.fecha_factura) = DATE(?)
             ORDER BY f.id DESC`,
            [todayISO]
        );
    } catch (error) {
        console.error("Error al obtener las facturas del día:", error);
        throw new Error("No se pudieron consultar las facturas del día.");
    }
}

export async function GetProductosDeFactura(facturaId) {
    if (!db) throw new Error("La base de datos no está inicializada.");
    try {
        return await db.getAllAsync(
            `SELECT fp.cantidad, fp.precio_unitario, p.nombre AS nombre_producto, p.precio_venta AS precio_actual_producto
             FROM facturacion_productos fp
             JOIN productos p ON fp.producto_id = p.id
             WHERE fp.factura_id = ?`,
            [facturaId]
        );
    } catch (error) {
        console.error(`Error al obtener productos para la factura ${facturaId}:`, error);
        throw new Error("No se pudieron consultar los detalles de los productos de la factura.");
    }
}

export async function GetFacturasPorLocal(localId) {
    if (!db) throw new Error("La base de datos no está inicializada.");
    try {
        return await db.getAllAsync(
            `SELECT id, fecha_factura, total_neto, total_bruto FROM facturas WHERE local_id = ? ORDER BY fecha_factura DESC`,
            [localId]
        );
    } catch (error) {
        console.error(`Error al obtener facturas para el local ${localId}:`, error);
        throw new Error("No se pudieron consultar las facturas del local.");
    }
}

// ─── CENSO LOCAL ─────────────────────────────────────────────────────────────
export const insertCensoLocal = async (datos) => {
    if (!db) await initDatabase();
    const {
        razon_social, nombre_fantasia, rif, segmento, categoria_oportunidad,
        tamano_cliente, sector, ciudad, direccion_fiscal, direccion_fisica,
        persona_contacto, telefono, whatsapp, correo_electronico, telefono_compras,
        correo_representante, compra_promedio, donde_recibe,
        frecuencia_visita, dia_visita, horario_visita, dia_despacho, horario_entrega,
        lat, lng, status, contribuyente_especial,
        municipio, estado, punto_referencia,
        representante_legal, rif_representante,
        correo_administracion, contacto_administracion, telefono_administracion,
        metodo_pago, observaciones, productos
    } = datos;

    const productosString = JSON.stringify(productos || []);
    const fechaActual = new Date().toISOString();

    try {
        const result = await db.runAsync(
            `INSERT INTO censo_local (
                razon_social, nombre_fantasia, rif, segmento, categoria_oportunidad,
                tamano_cliente, sector, ciudad, direccion_fiscal, direccion_fisica,
                persona_contacto, telefono, whatsapp, correo_electronico, telefono_compras,
                correo_representante, compra_promedio, donde_recibe,
                frecuencia_visita, dia_visita, horario_visita, dia_despacho, horario_entrega,
                lat, lng, status, contribuyente_especial,
                municipio, estado, punto_referencia,
                representante_legal, rif_representante,
                correo_administracion, contacto_administracion, telefono_administracion,
                metodo_pago, observaciones, productos_json, fecha_registro
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`,
            [
                razon_social ?? null,
                nombre_fantasia ?? null,
                rif ?? null,
                segmento ?? null,
                categoria_oportunidad ?? null,
                tamano_cliente ?? null,
                sector ?? null,
                ciudad ?? null,
                direccion_fiscal ?? null,
                direccion_fisica ?? null,
                persona_contacto ?? null,
                telefono ?? null,
                whatsapp ?? null,
                correo_electronico ?? null,
                telefono_compras ?? null,
                correo_representante ?? null,
                parseFloat(compra_promedio) || 0,
                donde_recibe ?? null,
                frecuencia_visita ?? null,
                dia_visita ?? null,
                horario_visita ?? null,
                dia_despacho ?? null,
                horario_entrega ?? null,
                lat ?? null,
                lng ?? null,
                status ?? 0,
                contribuyente_especial ? 1 : 0,
                municipio ?? null,
                estado ?? null,
                punto_referencia ?? null,
                representante_legal ?? null,
                rif_representante ?? null,
                correo_administracion ?? null,
                contacto_administracion ?? null,
                telefono_administracion ?? null,
                metodo_pago ?? null,
                observaciones ?? null,
                productosString,
                fechaActual
            ]
        );
        console.log("✅ Guardado en SQLite Local con ID:", result.lastInsertRowId);
        return result.lastInsertRowId;
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            throw new Error("Este RIF ya está registrado en tu base de datos local.");
        }
        throw error;
    }
};

export const getCensoLocal = async () => {
    if (!db) await initDatabase();
    try {
        const allRows = await db.getAllAsync('SELECT * FROM censo_local ORDER BY id DESC');
        return allRows.map(row => ({
            ...row,
            productos: row.productos_json ? JSON.parse(row.productos_json) : []
        }));
    } catch (error) {
        console.error("Error al obtener censo:", error);
        return [];
    }
};

export const exportarCensoAExcel = async () => {
    try {
        const datos = await getCensoLocal();
        if (datos.length === 0) {
            Alert.alert("Aviso", "No hay datos para exportar.");
            return;
        }
        const datosLimpios = datos.map(row => ({
            "RAZON SOCIAL": row.razon_social || '',
            "DIRECCION FISCAL": row.direccion_fiscal || '',
            "RIF/CI": row.rif || '',
            "REPRESENTANTE LEGAL": row.representante_legal || '',
            "RIF/C.I.": row.rif_representante || '',
            "CIUDAD": row.ciudad || '',
            "CONTRIBUYENTE ESPECIAL": row.contribuyente_especial === 1 ? "Sí" : "No",
            "NOMBRE COMERCIAL": row.nombre_fantasia || '',
            "DIRECCION FISICA": row.direccion_fisica || '',
            "MUNICIPIO": row.municipio || '',
            "ESTADO": row.estado || '',
            "PUNTO REFERENCIA": row.punto_referencia || '',
            "TELEFONO PRINCIPAL": row.telefono || '',
            "WHATSAPP": row.whatsapp || '',
            "CORREO ELECTRONICO": row.correo_electronico || '',
            "Tipos de Cliente": row.segmento || '',
            "CATEGORIA EIG": row.categoria_oportunidad || '',
            "TAMAÑO CLIENTE": row.tamano_cliente || '',
            "PERSONA CONTACTO COMPRA": row.persona_contacto || '',
            "CORREO ELECTRONICO COMPRAS": row.correo_representante || '',
            "TELEFONO COMPRAS": row.telefono_compras || '',
            "PERSONA CONTACTO ADMINISTRACION": row.contacto_administracion || '',
            "CORREO ELECTRONICO ADMINISTRACION": row.correo_administracion || '',
            "TELEFONO ADMINISTRACION": row.telefono_administracion || '',
            "PRODUCTO INTERES": Array.isArray(row.productos)
                ? row.productos.map(p => `${p.nombre} (${p.cantidad})`).join(', ')
                : '',
            "COMPRA PROMEDIO MES ($)": row.compra_promedio || 0,
            "DONDE RECIBE": row.donde_recibe || '',
            "FRECUENCIA DE COMPRA": row.frecuencia_visita || '',
            "DIA SUGERIDO VISITA": row.dia_visita || '',
            "HORARIO VISITA": row.horario_visita || '',
            "DIA SUGERIDO DE ENTREGAS": row.dia_despacho || '',
            "HORARIO ENTREGAS": row.horario_entrega || '',
            "METODO DE PAGO": row.metodo_pago || '',
            "GPS LATITUD": row.lat || '',
            "GPS LONGITUD": row.lng || '',
            "OBSERVACIONES": row.observaciones || '',
        }));
        const ws = XLSX.utils.json_to_sheet(datosLimpios);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "CensoClientes");
        const wbout = XLSX.write(wb, { type: 'binary', bookType: 'xlsx' });
        const uri = FileSystem.cacheDirectory + 'Censo_EcoInn.xlsx';
        const base64Data = Buffer.from(wbout, 'binary').toString('base64');
        await FileSystem.writeAsStringAsync(uri, base64Data, { encoding: 'base64' });
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: 'Enviar Censo a WhatsApp',
                UTI: 'com.microsoft.excel.xlsx'
            });
        } else {
            Alert.alert("Error", "La opción de compartir no está disponible.");
        }
    } catch (error) {
        console.error("Error al exportar:", error);
        Alert.alert("Error", "Error al generar el archivo Excel: " + error.message);
    }
};

export const migrarCensoLocal = async () => {
    if (!db) await initDatabase();
    const columnas = [
        'municipio TEXT', 'estado TEXT', 'punto_referencia TEXT',
        'whatsapp TEXT', 'correo_electronico TEXT', 'telefono_compras TEXT',
        'representante_legal TEXT', 'rif_representante TEXT',
        'correo_representante TEXT', 'contacto_administracion TEXT',
        'telefono_administracion TEXT', 'correo_administracion TEXT',
        'metodo_pago TEXT', 'ciudad TEXT', 'direccion_fisica TEXT',
        'tamano_cliente TEXT', 'donde_recibe TEXT',
        'horario_visita TEXT', 'horario_entrega TEXT', 'observaciones TEXT',
    ];
    for (const col of columnas) {
        try { await db.runAsync(`ALTER TABLE censo_local ADD COLUMN ${col};`); }
        catch (_) { /* columna ya existe */ }
    }
    console.log('Migración censo_local ✅');
};

export const borrarCensoLocal = async () => {
    if (!db) await initDatabase();
    try {
        await db.runAsync(`DELETE FROM censo_local;`);
        console.log('🗑️ Censo borrado ✅');
    } catch (error) {
        console.error('Error al borrar censo:', error);
        throw error;
    }
};

export const importarLocalesDesdeXLSX = async () => {
    try {
        const resultado = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
        });

        if (resultado.canceled) return;

        const uri = resultado.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();

        const locales = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const base64 = e.target.result.split(',')[1] || e.target.result;
                    const workbook = XLSX.read(base64, { type: 'base64' });
                    const hoja = workbook.Sheets[workbook.SheetNames[0]];
                    const filas = XLSX.utils.sheet_to_json(hoja, { defval: '' });

                    const mapeados = filas.map(fila => ({
                        rif_ci: String(fila['RIF/CI'] || '').trim(),
                        razon_social: String(fila['RAZON SOCIAL'] || '').trim(),
                        direccion_fiscal: String(fila['DIRECCION FISCAL'] || '').trim(),
                        contribuyente_especial: String(fila['CONTRIBUYENTE ESPECIAL'] || '').trim(),
                        punto_referencia: String(fila['PUNTO REFERENCIA'] || '').trim(),
                        telefono_principal: String(fila['TELEFONO PRINCIPAL'] || '').trim(),
                        tipos_cliente: String(fila['Tipos de Cliente'] || '').trim(),
                        gps_latitud: parseFloat(fila['GPS LATITUD']) || null,
                        gps_longitud: parseFloat(fila['GPS LONGITUD']) || null,
                    })).filter(l => l.rif_ci);

                    resolve(mapeados);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
            reader.readAsDataURL(blob);
        });

        if (locales.length === 0) {
            Alert.alert('Aviso', 'El archivo no tiene filas válidas.');
            return;
        }

        if (!db) await initDatabase();

        let insertados = 0;
        let errores = 0;

        await db.withTransactionAsync(async () => {
            for (const local of locales) {
                try {
                    await db.runAsync(
                        `INSERT INTO locales
                            (rif_ci, razon_social, direccion_fiscal, contribuyente_especial,
                             punto_referencia, telefono_principal, tipos_cliente, gps_latitud, gps_longitud)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                         ON CONFLICT(rif_ci) DO UPDATE SET
                             razon_social           = excluded.razon_social,
                             direccion_fiscal       = excluded.direccion_fiscal,
                             contribuyente_especial = excluded.contribuyente_especial,
                             punto_referencia       = excluded.punto_referencia,
                             telefono_principal     = excluded.telefono_principal,
                             tipos_cliente          = excluded.tipos_cliente,
                             gps_latitud            = excluded.gps_latitud,
                             gps_longitud           = excluded.gps_longitud;`,
                        [
                            local.rif_ci, local.razon_social, local.direccion_fiscal,
                            local.contribuyente_especial, local.punto_referencia,
                            local.telefono_principal, local.tipos_cliente,
                            local.gps_latitud, local.gps_longitud
                        ]
                    );
                    insertados++;
                } catch (e) {
                    console.warn('⚠️ Error fila:', local.rif_ci, e.message);
                    errores++;
                }
            }
        });

        Alert.alert(
            'Importación completada ✅',
            `${insertados} locales guardados.${errores > 0 ? `\n${errores} filas con error.` : ''}`
        );

    } catch (error) {
        console.error('❌ Error:', error);
        Alert.alert('Error', error.message);
    }
};

export const migrarTablaLocal = async () => {
    if (!db) await initDatabase();
    try {
        const info = await db.getAllAsync(`PRAGMA table_info(locales);`);
        const columnas = info.map(c => c.name);

        if (columnas.includes('rif_ci')) {
            console.log('✅ Tabla locales ya está migrada');
            return;
        }

        await db.runAsync(`DROP TABLE IF EXISTS local_nueva;`);
        await db.runAsync(`
            CREATE TABLE local_nueva (
                id                     INTEGER PRIMARY KEY AUTOINCREMENT,
                rif_ci                 TEXT NOT NULL UNIQUE,
                tipos_cliente          TEXT,
                razon_social           TEXT,
                direccion_fiscal       TEXT,
                contribuyente_especial TEXT,
                punto_referencia       TEXT,
                telefono_principal     TEXT,
                gps_latitud            REAL,
                gps_longitud           REAL
            );
        `);

        if (columnas.includes('ci_rif')) {
            await db.runAsync(`
                INSERT OR IGNORE INTO local_nueva 
                    (id, rif_ci, tipos_cliente, razon_social, direccion_fiscal, gps_latitud, gps_longitud)
                SELECT id, ci_rif, tipo_local, nombre_local, ubicacion_texto, lat, lon
                FROM locales;
            `);
        }

        await db.runAsync(`DROP TABLE IF EXISTS locales;`);
        await db.runAsync(`ALTER TABLE local_nueva RENAME TO locales;`);
        console.log('✅ Migración tabla locales completada');

    } catch (error) {
        console.error('❌ Error en migración:', error);
    }
};

export const verificarLocales = async () => {
    if (!db) await initDatabase();
    try {
        const total = await db.getFirstAsync(`SELECT COUNT(*) as total FROM locales;`);
        const muestra = await db.getAllAsync(`SELECT * FROM locales LIMIT 5;`);
        console.log('📊 Total locales:', total.total);
        console.log('📋 Muestra:', JSON.stringify(muestra, null, 2));
    } catch (e) {
        console.error('❌ verificarLocales error:', e.message);
    }
};

export const DeleLocales = async () => {
    if (!db) await initDatabase();
    try {
        await db.runAsync(`DELETE FROM locales;`);
        console.log('🗑️ Tabla locales borrada ✅');
    } catch (error) {
        console.error('Error al borrar tabla locales:', error);
        throw error;
    }
};

export const buscarLocalesPorNombre = async (texto) => {
    if (!db) await initDatabase();
    if (!texto.trim()) return [];
    try {
        const patron = `%${texto}%`;
        return await db.getAllAsync(
            `SELECT *
             FROM locales
             WHERE razon_social LIKE ? OR rif_ci LIKE ?
             LIMIT 10;`,
            [patron, patron]
        );
    } catch (e) {
        console.error('Error buscando locales:', e);
        return [];
    }
};

// ‼️ NUEVA FUNCIÓN PARA GUARDAR VENTAS ‼️
export const guardarVenta = async (ventaData) => {
    if (!db) await initDatabase();

    const {
        local_id, razon_social, rif_ci, contribuyente,
        tipo_documento, tipo_pago, dias_credito, moneda,
        productos_json, subtotal, iva, total, fecha,
        despacho  // 👈 nuevo
    } = ventaData;
    console.log('Guardando venta:', ventaData);
    try {
        const result = await db.runAsync(
            `INSERT INTO ventas 
                (local_id, razon_social, rif_ci, contribuyente, tipo_documento,
                 tipo_pago, dias_credito, moneda, productos_json, subtotal, iva, total, fecha, despacho)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
                local_id, razon_social, rif_ci, contribuyente, tipo_documento,
                tipo_pago, dias_credito, moneda, productos_json,
                subtotal, iva, total, fecha,
                despacho  // 👈 nuevo
            ]
        );
        console.log('✅ Venta guardada con ID:', result.lastInsertRowId);
        return result.lastInsertRowId;
    } catch (error) {
        console.error('Error guardando venta:', error);
        throw error;
    }
};

// ─── Helper: separa el texto de despacho en tipo + fecha ──────────────────
const parseDespacho = (despachoTexto) => {
  if (!despachoTexto) return { tipo: '', fecha: '' };

  const partes = despachoTexto.split(' - ');
  if (partes.length === 2) {
    // Tiene fecha: "Vendedor - 23 sep 2026"
    return { tipo: partes[0].trim(), fecha: partes[1].trim() };
  }
  // No tiene fecha: "Ecoinn" (o registros viejos sin formato)
  return { tipo: despachoTexto.trim(), fecha: '' };
};

// ─── Exportar ventas a Excel ────────────────────────────────────────────────
export const exportarVentasAExcel = async () => {
  if (!db) await initDatabase();
  try {
    const ventas = await db.getAllAsync(`
      SELECT
        v.id, v.fecha, v.razon_social, v.rif_ci,
        v.contribuyente, v.tipo_documento, v.tipo_pago,
        v.dias_credito, v.moneda, v.productos_json,
        v.subtotal, v.iva, v.total, v.despacho, l.punto_referencia,
        l.direccion_fiscal, l.telefono_principal, l.tipos_cliente,
        l.gps_latitud, l.gps_longitud
      FROM ventas v
      LEFT JOIN locales l ON v.local_id = l.id
      ORDER BY v.fecha DESC
    `);

    if (ventas.length === 0) {
      Alert.alert("Aviso", "No hay ventas para exportar.");
      return;
    }

    // 1. Mapear las ventas y recolectar TODOS los nombres de productos únicos
    const productosUnicos = new Set();
    const ventasProcesadas = ventas.map(vta => {
      let productosLista = [];
      try {
        productosLista = JSON.parse(vta.productos_json || '[]');
      } catch (e) {
        console.error("Error parseando productos_json en ID: " + vta.id, e);
      }

      productosLista.forEach(p => {
        if (p.nombre) productosUnicos.add(p.nombre.trim());
      });

      return { vta, productosLista };
    });

    const columnasProductos = Array.from(productosUnicos).sort();

    // 2. Construir las filas finales del Excel
    const filasExcel = ventasProcesadas.map(({ vta, productosLista }) => {
      const fila = {
        "ID": vta.id,
        "FECHA": vta.fecha ? new Date(vta.fecha).toLocaleString('es-VE') : '',
        "CLIENTE": vta.razon_social || '',
        "RIF/CI": vta.rif_ci || '',
        "TIPO CONTRIBUYENTE": vta.contribuyente,
        "DOCUMENTO": vta.tipo_documento === 'factura' ? 'Factura' : 'Nota de Entrega',
        "PAGO": vta.tipo_pago === 'credito' ? `Crédito ${vta.dias_credito}d` : 'Contado',
        "MONEDA": vta.moneda?.toUpperCase() || 'USD',
        "Zona": vta.punto_referencia || '',
      };

      columnasProductos.forEach(nombreProducto => {
        const productoVendido = productosLista.find(p => p.nombre?.trim() === nombreProducto);
        fila[nombreProducto] = productoVendido ? productoVendido.cantidad : 0;
      });

      // Separa el texto de despacho en dos columnas
      const { tipo: despachoTipo, fecha: despachoFecha } = parseDespacho(vta.despacho);

      Object.assign(fila, {
        "SUBTOTAL": (vta.subtotal || 0).toFixed(2),
        "TOTAL": (vta.total || 0).toFixed(2),
        "DIRECCIÓN FISCAL": vta.direccion_fiscal || '',
        "TELÉFONO": vta.telefono_principal || '',
        "TIPO CLIENTE": vta.tipos_cliente || '',
        "DESPACHO": despachoTipo,
        "FECHA DESPACHO": despachoFecha,
        "GPS LATITUD": vta.gps_latitud || '',
        "GPS LONGITUD": vta.gps_longitud || '',
      });

      return fila;
    });

    const ws = XLSX.utils.json_to_sheet(filasExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ventas");
    const wbout = XLSX.write(wb, { type: 'binary', bookType: 'xlsx' });
    const uri = FileSystem.cacheDirectory + 'Ventas_EcoInn.xlsx';
    const base64Data = Buffer.from(wbout, 'binary').toString('base64');
    await FileSystem.writeAsStringAsync(uri, base64Data, { encoding: 'base64' });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Enviar ventas a WhatsApp',
        UTI: 'com.microsoft.excel.xlsx'
      });
    } else {
      Alert.alert("Error", "La opción de compartir no está disponible.");
    }
  } catch (error) {
    console.error("Error al exportar ventas:", error);
    Alert.alert("Error", "No se pudo generar el archivo Excel: " + error.message);
  }
};

export const borrarTodasVentas = async () => {
    // Asegurar que la BD esté inicializada y la variable global 'db' disponible
    if (!db) await initDatabase();
    try {
        await db.runAsync('DELETE FROM ventas;');
        // Opcional: reiniciar el contador autoincremental (para que el próximo ID empiece en 1)
        await db.runAsync("DELETE FROM sqlite_sequence WHERE name='ventas';");
        console.log('✅ Todas las ventas han sido eliminadas');
    } catch (error) {
        console.error('Error al borrar ventas:', error);
        throw error;
    }
};


const migrarVentas = async () => {
    try {
        // Verificar si la columna ya existe
        const tableInfo = await db.getAllAsync(`PRAGMA table_info(ventas)`);
        const columnas = tableInfo.map(col => col.name);

        if (!columnas.includes('despacho')) {
            await db.runAsync(`ALTER TABLE ventas ADD COLUMN despacho TEXT`);
            console.log("Migración ventas: columna 'despacho' agregada ✅");
        } else {
            console.log("Migración ventas: 'despacho' ya existe, sin cambios ✅");
        }
    } catch (error) {
        console.error("Error en migrarVentas:", error);
        throw error;
    }
};

export const insertLocal1 = async (localData) => {
    // 1. Desestructuramos con valores por defecto para evitar errores de "undefined"
    const { 
        ciRif = '', 
        tipoLocal = '', 
        nombreLocal = '', 
        ubicacionTexto = '', 
        location = null, // Lo inicializamos en null
        contribuyenteEspecial = 0, 
        puntoReferencia = '', 
        telefonoPrincipal = '' 
    } = localData;
    
    // 2. Extraemos latitud y longitud de forma segura usando el operador ?.
    // Si location es null/undefined, guardará null en la base de datos en lugar de romper la app
    const latitud = location?.latitude ?? null;
    const longitud = location?.longitude ?? null;

    try {
        const result = await db.runAsync(
            `INSERT INTO locales 
                (rif_ci, tipos_cliente, razon_social, direccion_fiscal,
                 contribuyente_especial, punto_referencia, telefono_principal,
                 gps_latitud, gps_longitud) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                ciRif, 
                tipoLocal, 
                nombreLocal, 
                ubicacionTexto,
                contribuyenteEspecial, 
                puntoReferencia, 
                telefonoPrincipal,
                latitud, 
                longitud
            ]
        );
        console.log("✅ Local insertado con json exitosamente, Telefono:", telefonoPrincipal, "ID:", result.lastInsertRowId);
        return result.lastInsertRowId;
    } catch (error) {
        console.error("Error al insertar el local en la base de datos:", error);
        throw error; // Lanzamos el error para manejarlo en la UI (ej. mostrar una alerta)
    }
};

export const actualizarLocal = async (local) => {
  await db.runAsync(
    `UPDATE locales SET
      razon_social = ?, rif_ci = ?, direccion_fiscal = ?,
      contribuyente_especial = ?, punto_referencia = ?,
      telefono_principal = ?, tipos_cliente = ?
     WHERE id = ?`,
    [
      local.razon_social, local.rif_ci, local.direccion_fiscal,
      local.contribuyente_especial, local.punto_referencia,
      local.telefono_principal, local.tipos_cliente, local.id,
    ]
  );
};

export const actualizarVenta = async (ventaData) => {
  if (!db) await initDatabase();
  const {
    id, contribuyente, tipo_documento, tipo_pago,
    dias_credito, moneda, productos_json,
    subtotal, iva, total, despacho
  } = ventaData;
  try {
    await db.runAsync(
      `UPDATE ventas SET
        contribuyente = ?, tipo_documento = ?, tipo_pago = ?,
        dias_credito = ?, moneda = ?, productos_json = ?,
        subtotal = ?, iva = ?, total = ?, despacho = ?
       WHERE id = ?`,
      [
        contribuyente, tipo_documento, tipo_pago,
        dias_credito, moneda, productos_json,
        subtotal, iva, total, despacho, id
      ]
    );
    console.log('✅ Venta actualizada ID:', id);
  } catch (error) {
    console.error('Error actualizando venta:', error);
    throw error;
  }
};