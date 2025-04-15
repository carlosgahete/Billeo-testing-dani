// Este archivo contiene la URL del logo de Billeo para uso en correos electrónicos

// Usamos un servicio garantizado y permanente para imágenes (vía Data URI)
// Esta técnica incrusta la imagen directamente en el HTML del correo electrónico
// y es soportada por todos los clientes de correo modernos
export const BILLEO_LOGO_DATA_URI = `data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+Cjxzdmcgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIHZpZXdCb3g9IjAgMCAyMDAgMjAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDwhLS0gRm9uZG8gdHJhbnNwYXJlbnRlIC0tPgogIDxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ0cmFuc3BhcmVudCIvPgogIAogIDwhLS0gQmFycmEgcm9qYSAoaXpxdWllcmRhKSAtLT4KICA8cmVjdCB4PSI0MCIgeT0iMTEwIiB3aWR0aD0iMzAiIGhlaWdodD0iNjAiIHJ4PSIxMCIgcnk9IjEwIiBmaWxsPSIjRkYwMDAwIi8+CiAgCiAgPCEtLSBCYXJyYSBhbWFyaWxsYSAoY2VudHJvKSAtLT4KICA8cmVjdCB4PSI4NSIgeT0iODAiIHdpZHRoPSIzMCIgaGVpZ2h0PSI5MCIgcng9IjEwIiByeT0iMTAiIGZpbGw9IiNGRkREMDAiLz4KICAKICA8IS0tIEJhcnJhIGF6dWwgKGRlcmVjaGEpIC0tPgogIDxyZWN0IHg9IjEzMCIgeT0iNjAiIHdpZHRoPSIzMCIgaGVpZ2h0PSIxMTAiIHJ4PSIxMCIgcnk9IjEwIiBmaWxsPSIjMDA3N0NDIi8+Cjwvc3ZnPg==`;

// URL para el logo de Billeo (alojado localmente)
// Usamos una URL que apunta a nuestra carpeta pública
export const BILLEO_LOGO_URL = 'http://localhost:5000/images/billeo-logo.svg';

// URL alternativa - En caso de que la primera no funcione
export const BILLEO_LOGO_URL_ALT = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bar%20chart/3D/bar_chart_3d.png';

// URL de respaldo - En caso de que las anteriores fallen
export const BILLEO_LOGO_URL_BACKUP = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Chart%20increasing/3D/chart_increasing_3d.png';