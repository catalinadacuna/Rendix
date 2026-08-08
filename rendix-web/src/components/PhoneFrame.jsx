import { useRendix } from '../context/RendixContext';

export const PhoneFrame = ({ children }) => {
  const { t } = useRendix();
  const isDark = t.bg === "#0E1524";

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
          backgroundColor: t.bg,
          borderRadius: 44,
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.45)",
          border: `10px solid ${isDark ? "#000" : "#1B1F27"}`,
        }}
      >
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};