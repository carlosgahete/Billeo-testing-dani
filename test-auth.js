// Script simplificado usando curl a través de exec
import { exec } from 'child_process';
import { promisify } from 'util';
const execPromise = promisify(exec);

// URL base de la API
const BASE_URL = 'http://localhost:5000';

// Función para ejecutar comandos curl con promesas
async function curl(command) {
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stderr) {
      console.error(`Error: ${stderr}`);
    }
    return stdout;
  } catch (error) {
    console.error(`Error de ejecución: ${error.message}`);
    throw error;
  }
}

// Función para iniciar sesión y guardar cookies
async function login(username, password) {
  const command = `curl -c cookies.txt -X POST -H "Content-Type: application/json" -d '{"username":"${username}","password":"${password}"}' ${BASE_URL}/api/login`;
  
  try {
    const output = await curl(command);
    console.log('Resultado del login:', output);
    return JSON.parse(output);
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    throw error;
  }
}

// Función para obtener datos del usuario actual usando las cookies
async function getUser() {
  const command = `curl -b cookies.txt -X GET ${BASE_URL}/api/user`;
  
  try {
    const output = await curl(command);
    console.log('Resultado de getUser:', output);
    return JSON.parse(output);
  } catch (error) {
    console.error('Error al obtener datos del usuario:', error);
    throw error;
  }
}

// Función para obtener stats del dashboard
async function getDashboardStats() {
  const command = `curl -b cookies.txt -X GET "${BASE_URL}/api/stats/dashboard?year=2025&period=all"`;
  
  try {
    const output = await curl(command);
    console.log('Resultado del dashboard:', output);
    return JSON.parse(output);
  } catch (error) {
    console.error('Error al obtener stats del dashboard:', error);
    throw error;
  }
}

// Función para obtener stats del dashboard-fix
async function getDashboardStatsFix() {
  const command = `curl -b cookies.txt -X GET "${BASE_URL}/api/stats/dashboard-fix?year=2025&period=all"`;
  
  try {
    const output = await curl(command);
    console.log('Resultado del dashboard-fix:', output);
    return JSON.parse(output);
  } catch (error) {
    console.error('Error al obtener stats del dashboard-fix:', error);
    throw error;
  }
}

// Función principal
async function main() {
  try {
    console.log('Iniciando sesión...');
    await login('demo', 'demo');
    
    console.log('\nObteniendo información del usuario...');
    await getUser();
    
    console.log('\nObteniendo estadísticas del dashboard...');
    await getDashboardStats();
    
    console.log('\nObteniendo estadísticas del dashboard-fix...');
    await getDashboardStatsFix();
    
    console.log('\nProceso completado con éxito');
  } catch (error) {
    console.error('Error en el proceso:', error);
  }
}

// Ejecutar el programa
main();