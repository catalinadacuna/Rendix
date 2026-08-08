// Sistema de diseño de Rendix Starter — fuente única de verdad para colores y formato.
// Basado en la sección 13.2 del Documento Maestro. Todo componente visual debe
// consumir estos tokens en vez de definir colores propios.

export const TOKENS_LIGHT = {
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
};

export const TOKENS_DARK = {
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
};

export const getTheme = (dark) => (dark ? TOKENS_DARK : TOKENS_LIGHT);

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
// Estas funciones devuelven objetos `style` ya resueltos con los tokens actuales,
// para no repetir el mismo bloque de radios/bordes en cada pantalla.

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
  color: "#fff",
  fontWeight: 700,
  fontSize: 14.5,
  cursor: enabled ? "pointer" : "not-allowed",
});

export const cardStyle = (t) => ({
  backgroundColor: t.surface,
  border: `1px solid ${t.border}`,
  borderRadius: 20,
});