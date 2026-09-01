import { useRendix } from '../context/RendixContext';

export const PhoneFrame = ({ children }) => {
  const { t, skinActual } = useRendix();
  const isDark = Boolean(skinActual?.dark);

  return (
    <div
      className="w-full flex items-center justify-center"
      style={{
        background: `radial-gradient(circle at 50% 0%, ${t.navySoft}22, transparent 60%), ${isDark ? "#05070C" : "#E7ECEB"}`,
        minHeight: "100vh",
        padding: "28px 12px",
      }}
    >
      <div
        className="relative overflow-hidden flex flex-col"
        style={{
          width: 375,
          height: 780,
          // Si la ventana es más baja que el marco, el teléfono se achica en vez
          // de quedar cortado fuera de la pantalla. Los 56px son el padding de arriba y abajo.
          maxHeight: "calc(100vh - 56px)",
          backgroundColor: t.bg,
          borderRadius: 44,
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.45)",
          border: `10px solid ${isDark ? "#000" : "#1B1F27"}`,
        }}
      >
        {/* minHeight: 0 permite que este contenedor se encoja y que el scroll
            interno de cada pantalla funcione. Sin esto, crece con el contenido. */}
        <div className="flex-1 flex flex-col relative overflow-hidden" style={{ minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  );
};