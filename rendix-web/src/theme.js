// Sistema de diseño de RendiFácil — fuente única de verdad para colores y formato.
// Todo componente visual debe consumir estos tokens en vez de definir colores propios.
//
// Desde sept-2026 hay 5 skins. Cada uno trae el mismo juego de tokens, así que
// cualquier componente que use `t.algo` funciona con los 5 sin tocarse.

// ---------------- Paletas ----------------

const CLASICO = {
  navy: "#1B2A4A",
  navySoft: "#2C3F63",
  teal: "#2E6F6E",
  tealSoft: "#DCEBEA",
  amber: "#E0A11C",
  amberSoft: "#FBF0DA",
  red: "#C1443C",
  redSoft: "#F8E3E1",
  gray: "#6B7280",
  grayLight: "#9AA3AF",
  bg: "#F1F5F4",
  surface: "#FFFFFF",
  border: "#E4E9E8",
  text: "#16202E",
  onAccent: "#FFFFFF", // color de texto sobre fondo `teal`
};

const NOCHE = {
  navy: "#EAF0FF",
  navySoft: "#C7D3EA",
  teal: "#5BC2BE",
  tealSoft: "#173634",
  amber: "#F0BC53",
  amberSoft: "#3A2E13",
  red: "#E8756D",
  redSoft: "#3A1D1B",
  gray: "#9AA6B6",
  grayLight: "#6E7A8C",
  bg: "#0E1524",
  surface: "#182238",
  border: "#2A3550",
  text: "#EDF1F8",
  onAccent: "#0E1524", // el teal claro pide texto oscuro encima, no blanco
};

const FAENA = {
  navy: "#5C3A2E",
  navySoft: "#7A5040",
  teal: "#C05621",
  tealSoft: "#FBEADF",
  amber: "#D97706",
  amberSoft: "#FDF0DC",
  red: "#B91C1C",
  redSoft: "#FBE4E4",
  gray: "#8A7568",
  grayLight: "#B8A99E",
  bg: "#FAF5F0",
  surface: "#FFFFFF",
  border: "#EDE0D6",
  text: "#3D2419",
  onAccent: "#FFFFFF",
};

const BOSQUE = {
  navy: "#14342B",
  navySoft: "#2A5044",
  teal: "#2F855A",
  tealSoft: "#DFEFE6",
  amber: "#B7791F",
  amberSoft: "#F8EFD9",
  red: "#C53030",
  redSoft: "#F9E2E2",
  gray: "#6E8279",
  grayLight: "#A0B0A8",
  bg: "#F0F5F2",
  surface: "#FFFFFF",
  border: "#DDE8E2",
  text: "#12302A",
  onAccent: "#FFFFFF",
};

const INDIGO = {
  navy: "#2A2359",
  navySoft: "#453D80",
  teal: "#5A4FCF",
  tealSoft: "#E6E3F9",
  amber: "#D69E2E",
  amberSoft: "#FAF0DB",
  red: "#C1443C",
  redSoft: "#F8E3E1",
  gray: "#7A76A0",
  grayLight: "#A9A6C4",
  bg: "#F4F3FA",
  surface: "#FFFFFF",
  border: "#E4E2F0",
  text: "#221D4A",
  onAccent: "#FFFFFF",
};

// ---------------- Registro de skins ----------------
// `dark` indica si el skin es de fondo oscuro. Se usa para invertir cosas que no
// son color puro (sombras, íconos) sin tener que preguntar por el id del skin.

export const SKINS = {
  clasico: {
    id: "clasico",
    nombre: "Clásico",
    descripcion: "Navy y teal. La identidad original de RendiFácil.",
    dark: false,
    tokens: CLASICO,
  },
  noche: {
    id: "noche",
    nombre: "Noche",
    descripcion: "Fondo oscuro. Descansa la vista de noche o en interiores.",
    dark: true,
    tokens: NOCHE,
  },
  faena: {
    id: "faena",
    nombre: "Faena",
    descripcion: "Tierra y naranja. Cálido, con aire de obra y terreno.",
    dark: false,
    tokens: FAENA,
  },
  bosque: {
    id: "bosque",
    nombre: "Bosque",
    descripcion: "Verde profundo. Sobrio y con buen contraste a pleno sol.",
    dark: false,
    tokens: BOSQUE,
  },
  indigo: {
    id: "indigo",
    nombre: "Índigo",
    descripcion: "Frío y moderno. El más tecnológico de los cinco.",
    dark: false,
    tokens: INDIGO,
  },
};

export const DEFAULT_SKIN = "clasico";

// Lista ordenada para pintar el selector de la pantalla de Perfil.
export const SKIN_LIST = [
  SKINS.clasico,
  SKINS.noche,
  SKINS.faena,
  SKINS.bosque,
  SKINS.indigo,
];

// Los 5 colores que se muestran como muestra de paleta en cada tarjeta del selector.
export const swatchesDe = (skin) => [
  skin.tokens.navy,
  skin.tokens.teal,
  skin.tokens.amber,
  skin.tokens.red,
  skin.tokens.bg,
];

export const esSkinValido = (id) => Object.prototype.hasOwnProperty.call(SKINS, id);

// Devuelve los tokens del skin pedido. Si llega un id desconocido (o nada),
// cae en Clásico para que la app nunca quede sin colores.
// Acepta además un booleano por compatibilidad con el `getTheme(dark)` antiguo.
export const getTheme = (skinId) => {
  if (typeof skinId === "boolean") return skinId ? SKINS.noche.tokens : SKINS.clasico.tokens;
  return (SKINS[skinId] || SKINS[DEFAULT_SKIN]).tokens;
};

// Compatibilidad con imports antiguos.
export const TOKENS_LIGHT = CLASICO;
export const TOKENS_DARK = NOCHE;

// ---------------- Formatters ----------------

export const fmtCLP = (n) => "$" + Math.round(n || 0).toLocaleString("es-CL");

export const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
};

// Usado en campos de presupuesto: agrega puntos de miles mientras se escribe.
export const formatThousands = (value) => {
  const raw = String(value).replace(/\D/g, "");
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// ---------------- Estilos reutilizables ----------------

export const inputStyle = (t, level = "default") => ({
  width: "100%",
  padding: "11px 12px",
  borderRadius: 12,
  border: `1.5px solid ${level === "low" ? t.red : level === "mid" ? t.amber : t.border}`,
  backgroundColor: t.bg,
  color: t.text,
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
});

export const primaryButtonStyle = (t, enabled = true) => ({
  width: "100%",
  padding: "14px",
  borderRadius: 16,
  border: "none",
  backgroundColor: enabled ? t.teal : t.grayLight,
  color: enabled ? t.onAccent || "#fff" : "#fff",
  fontWeight: 700,
  fontSize: 14.5,
  cursor: enabled ? "pointer" : "not-allowed",
});

export const cardStyle = (t) => ({
  backgroundColor: t.surface,
  border: `1px solid ${t.border}`,
  borderRadius: 20,
});