import * as SQLite from 'expo-sqlite'; 
import { Alert } from 'react-native';

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
        `);
        
        console.log("Base de datos y tabla 'locales' inicializadas con éxito.");
        return true;
        
    } catch (error) {
        console.error("Error al inicializar la BD:", error);
        throw error; 
    }
};

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