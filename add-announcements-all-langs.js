const fs = require('fs');

// 读取现有的 i18n.ts 文件
const i18nPath = 'frontend/lib/i18n.ts';
let content = fs.readFileSync(i18nPath, 'utf8');

// 西班牙语公告翻译
const esAnnouncements = `
  announce: {
    overline: 'Anuncios Oficiales',
    title: 'Últimas Actualizaciones y Anuncios',
    subtitle: 'Todas las actualizaciones del protocolo, anuncios de eventos y notificaciones importantes se publicarán aquí primero.',
    emailPlaceholder: 'Ingrese correo para suscribirse',
    subscribe: 'Suscribirse',
    all: 'Todos',
    catUpdate: 'Actualización',
    catActivity: 'Evento',
    catSecurity: 'Seguridad',
    catPartnership: 'Asociación',
    catMaintenance: 'Mantenimiento',
    search: 'Buscar anuncios',
    pinned: 'Fijado',
    readMore: 'Leer más →',
    minRead: 'min de lectura',
    latestActivity: 'Última Actividad',
    byCategory: 'Por Categoría',
    followUs: 'Síguenos',
    versionHistory: 'Historial de Versiones',
    viewChangelog: 'Ver registro completo',
    currentVersion: 'Versión Actual',
    today: 'Hoy',
    yesterday: 'Ayer',
    days3: 'Hace 3 días',
    days8: 'Hace 8 días',
    days13: 'Hace 13 días',
    days18: 'Hace 18 días',
    joinGroup: 'Unirse al grupo',
    joinCommunity: 'Unirse a la comunidad',
    tutorials: 'Tutoriales',
    ann1Title: 'Lanzamiento Oficial de RWA Protocol V1.0',
    ann1Preview: 'RWA Protocol se lanza oficialmente en BSC mainnet con sistema completo de staking, retiro, referidos y nodos V1-V5...',
    ann2Title: 'Actualización V1.1: Optimización del Cálculo de Tarifas',
    ann2Preview: 'Esta actualización corrige problemas de cálculo de tarifas en condiciones específicas y optimiza el consumo de Gas...',
    ann3Title: 'Primer Sorteo Mensual: Premio de $48,200',
    ann3Preview: 'El sorteo mensual se realizará el 31 de marzo a las 20:00 UTC, actualmente 1,234 participantes...',
    ann4Title: 'RWA Protocol se Asocia con SlowMist',
    ann4Preview: 'Nos complace anunciar una asociación estratégica con SlowMist, líder en seguridad blockchain...',
    ann5Title: 'Actualización de Nodos: Recompensas V5 Aumentan al 50%',
    ann5Preview: 'Tras discusión comunitaria, la votación aprobó aumentar las recompensas del nodo V5 del 40% al 50%...',
    ann6Title: 'Alerta de Seguridad: Cuidado con Sitios de Phishing',
    ann6Preview: 'Recientemente se descubrieron ataques de phishing que imitan el sitio oficial de RWA Protocol...',
    ann7Title: 'Evento de Aniversario: Airdrop Exclusivo',
    ann7Preview: 'Para agradecer a los primeros partidarios, se realizará un airdrop exclusivo de tokens RWA...',
    ann8Title: 'Mantenimiento: Retiros Pausados el 7 de Febrero',
    ann8Preview: 'Para garantizar la estabilidad del sistema, realizaremos mantenimiento el 7 de febrero de 00:00-02:00 UTC...',
    timeline1: 'Actualización V1.1',
    timeline2: 'Sorteo Mensual',
    timeline3: 'Asociación SlowMist',
    timeline4: 'Actualización de Nodos',
    timeline5: 'Alerta de Seguridad',
    timeline6: 'Evento Airdrop',
    v11Change: 'Corrección de tarifas',
    v102Change: 'Optimización',
    v101Change: 'Parche de seguridad',
    v10Change: 'Lanzamiento oficial',
    notFound: 'Anuncio no encontrado',
    backToList: 'Volver a la lista',
    share: 'Compartir',
    copyLink: 'Copiar enlace',
    copied: 'Copiado',
    previous: 'Anterior',
    next: 'Siguiente',
  },
`;

console.log('Adding Spanish announcements...');
content = content.replace(/const es: TranslationMap = \{/, `const es: TranslationMap = {${esAnnouncements}`);

// 保存文件
fs.writeFileSync(i18nPath, content);
console.log('✅ Spanish announcements added!');
