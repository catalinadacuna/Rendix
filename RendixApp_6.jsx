import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Camera, ChevronLeft, Search, SlidersHorizontal, Plus, LogOut, Sun, Moon,
  Trash2, Check, Clock, X, AlertTriangle, FileText, Receipt, FolderKanban,
  Wallet, TrendingDown, Home, History as HistoryIcon, User, ChevronRight,
  RotateCcw, Building2, Calendar, DollarSign, Loader2, CircleCheck, CircleAlert, Pencil
} from "lucide-react";

/* ---------------------------------------------------------------
   RENDIX STARTER — prototipo funcional del MVP
   Basado en el Documento Maestro: captura fotográfica de boletas/
   facturas, OCR simulado, registro confirmado o diferido, saldo
   de proyecto en tiempo real, historial con filtros.
   ------------------------------------------------------------- */

const TOKENS_LIGHT = {
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
const TOKENS_DARK = {
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

const fmtCLP = (n) =>
  "$" + Math.round(n || 0).toLocaleString("es-CL");

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
};

const todayISO = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ---- Banco de "documentos" simulados que entrega la cámara + OCR ----
const RECEIPT_BANK = [
  { comercio: "Ferretería Maipú Ltda.", monto: 18990, tipo_documento: "boleta", confMonto: 0.94, confFecha: 0.9, confComercio: 0.88 },
  { comercio: "Copec Estación Providencia", monto: 34500, tipo_documento: "boleta", confMonto: 0.97, confFecha: 0.95, confComercio: 0.91 },
  { comercio: "Imprenta Digital Express", monto: 62300, tipo_documento: "factura", confMonto: 0.9, confFecha: 0.86, confComercio: 0.6 },
  { comercio: "Restaurant El Fogón", monto: 47850, tipo_documento: "boleta", confMonto: 0.45, confFecha: 0.88, confComercio: 0.7 },
  { comercio: "Arriendo de Andamios SPA", monto: 210000, tipo_documento: "factura", confMonto: 0.92, confFecha: 0.4, confComercio: 0.85 },
  { comercio: "Estacionamientos Centro", monto: 5200, tipo_documento: "boleta", confMonto: 0.55, confFecha: 0.93, confComercio: 0.38 },
  { comercio: "Sodimac Constructor", monto: 89990, tipo_documento: "factura", confMonto: 0.96, confFecha: 0.92, confComercio: 0.94 },
];

const CONF_HIGH = 0.8;
const CONF_LOW = 0.5;

function confLevel(v) {
  if (v >= CONF_HIGH) return "high";
  if (v >= CONF_LOW) return "mid";
  return "low";
}

// ---------------- Small building blocks ----------------

function StatusBadge({ estado, t }) {
  const isConfirmado = estado === "confirmado";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: isConfirmado ? t.tealSoft : t.amberSoft,
        color: isConfirmado ? t.teal : t.amber,
      }}
    >
      {isConfirmado ? <Check size={12} strokeWidth={3} /> : <Clock size={12} strokeWidth={3} />}
      {isConfirmado ? "Confirmado" : "Diferido"}
    </span>
  );
}

function ReceiptThumb({ tipo, size = 56, t }) {
  const isFactura = tipo === "factura";
  return (
    <div
      className="flex items-center justify-center shrink-0 rounded-xl"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(155deg, ${isFactura ? t.navySoft : t.teal} 0%, ${t.navy} 100%)`,
      }}
    >
      {isFactura ? (
        <FileText size={size * 0.42} color="#fff" strokeWidth={1.6} />
      ) : (
        <Receipt size={size * 0.42} color="#fff" strokeWidth={1.6} />
      )}
    </div>
  );
}

function FieldConfidence({ level, t }) {
  if (level === "high") return null;
  const isLow = level === "low";
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium mt-1"
      style={{ color: isLow ? t.red : t.amber }}
    >
      <CircleAlert size={12} />
      {isLow ? "Revisar: no se detectó con confianza" : "Confianza media, revisa el dato"}
    </span>
  );
}

function Toast({ toast, t }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      className="absolute left-1/2 z-50 -translate-x-1/2 rounded-2xl px-4 py-3 shadow-lg flex items-center gap-2"
      style={{
        bottom: 96,
        backgroundColor: isError ? t.red : t.navy,
        color: "#fff",
        maxWidth: "88%",
      }}
    >
      {isError ? <CircleAlert size={16} /> : <CircleCheck size={16} />}
      <span className="text-sm font-medium">{toast.msg}</span>
    </div>
  );
}

function BottomNav({ screen, go, t, pendingCount }) {
  const items = [
    { key: "dashboard", label: "Principal", icon: Home },
    { key: "history", label: "Historial", icon: HistoryIcon },
    { key: "profile", label: "Perfil", icon: User },
  ];
  return (
    <div
      className="absolute bottom-0 left-0 right-0 flex items-stretch"
      style={{ backgroundColor: t.surface, borderTop: `1px solid ${t.border}`, height: 68 }}
    >
      {items.map(({ key, label, icon: Icon }) => {
        const active = screen === key || (key === "dashboard" && screen === "projects");
        return (
          <button
            key={key}
            onClick={() => go(key)}
            className="flex-1 flex flex-col items-center justify-center gap-1 relative"
          >
            {key === "history" && pendingCount > 0 && (
              <span
                className="absolute top-1.5 right-[28%] rounded-full text-[10px] font-bold flex items-center justify-center"
                style={{ width: 16, height: 16, backgroundColor: t.amber, color: "#fff" }}
              >
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
            <Icon size={20} color={active ? t.teal : t.gray} strokeWidth={active ? 2.4 : 1.9} />
            <span className="text-[11px] font-medium" style={{ color: active ? t.teal : t.gray }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TopBar({ title, onBack, t, right }) {
  return (
    <div
      className="flex items-center justify-between px-3"
      style={{ height: 56, backgroundColor: t.surface, borderBottom: `1px solid ${t.border}` }}
    >
      <div className="flex items-center gap-1" style={{ minWidth: 40 }}>
        {onBack && (
          <button onClick={onBack} className="p-2 -ml-1 rounded-full" aria-label="Volver">
            <ChevronLeft size={20} color={t.text} />
          </button>
        )}
      </div>
      <span className="text-[15px] font-semibold truncate" style={{ color: t.text }}>{title}</span>
      <div style={{ minWidth: 40 }} className="flex justify-end">{right}</div>
    </div>
  );
}

function TextField({ label, icon: Icon, children, t, confLevelValue }) {
  return (
    <div className="mb-4">
      <label className="text-[12px] font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: t.gray }}>
        {Icon && <Icon size={13} />}
        {label}
      </label>
      {children}
      {confLevelValue && <FieldConfidence level={confLevelValue} t={t} />}
    </div>
  );
}

const inputStyle = (t, level) => ({
  width: "100%",
  padding: "11px 12px",
  borderRadius: 12,
  border: `1.5px solid ${level === "low" ? t.red : level === "mid" ? t.amber : t.border}`,
  backgroundColor: t.bg,
  color: t.text,
  fontSize: 15,
  outline: "none",
});

/* ==================================================================
   APP
   ================================================================== */

export default function RendixApp() {
  const [ready, setReady] = useState(false);
  const [dark, setDark] = useState(false);
  const t = dark ? TOKENS_DARK : TOKENS_LIGHT;

  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);

  const [screen, setScreen] = useState("login");
  const [history, setHistory] = useState(["login"]);
  const [toast, setToast] = useState(null);

  const [capturedReceipt, setCapturedReceipt] = useState(null);
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [filters, setFilters] = useState({ q: "", estado: "todos", tipo: "todos", desde: "", hasta: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newProjectDraft, setNewProjectDraft] = useState(null);
  const [editingSaldo, setEditingSaldo] = useState(false);

  const toastTimer = useRef(null);
  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  // ---------------- persistence ----------------
  useEffect(() => {
    (async () => {
      try {
        const [pRes, eRes, uRes] = await Promise.allSettled([
          window.storage.get("rendix:projects"),
          window.storage.get("rendix:expenses"),
          window.storage.get("rendix:session"),
        ]);
        let proj = pRes.status === "fulfilled" && pRes.value ? JSON.parse(pRes.value.value) : null;
        let exp = eRes.status === "fulfilled" && eRes.value ? JSON.parse(eRes.value.value) : null;
        let sess = uRes.status === "fulfilled" && uRes.value ? JSON.parse(uRes.value.value) : null;

        if (!proj) {
          proj = [
            {
              id: "proj-1",
              nombre: "Festival Costa Sur 2026",
              cliente: "Municipalidad de Con-Cón",
              presupuesto: 3500000,
              fechaInicio: "2026-07-01",
              fechaTermino: "2026-07-20",
              responsable: "Tú",
              estado: "activo",
            },
            {
              id: "proj-2",
              nombre: "Lanzamiento Marca Nortia",
              cliente: "Nortia Retail SpA",
              presupuesto: 1200000,
              fechaInicio: "2026-06-15",
              fechaTermino: "2026-07-30",
              responsable: "Tú",
              estado: "activo",
            },
          ];
        }
        if (!exp) {
          exp = [
            { id: uid(), proyectoId: "proj-1", monto: 34500, fecha: "2026-07-06", comercio: "Copec Estación Providencia", tipo_documento: "boleta", estado: "confirmado", creado: Date.now() - 86400000 * 2 },
            { id: uid(), proyectoId: "proj-1", monto: 89990, fecha: "2026-07-07", comercio: "Sodimac Constructor", tipo_documento: "factura", estado: "confirmado", creado: Date.now() - 86400000 },
            { id: uid(), proyectoId: "proj-1", monto: 47850, fecha: null, comercio: null, tipo_documento: null, estado: "diferido", creado: Date.now() - 3600000 * 5 },
            { id: uid(), proyectoId: "proj-2", monto: 210000, fecha: "2026-07-02", comercio: "Arriendo de Andamios SPA", tipo_documento: "factura", estado: "confirmado", creado: Date.now() - 86400000 * 4 },
          ];
        }
        setProjects(proj);
        setExpenses(exp);
        if (sess) {
          setUser(sess.user);
          setActiveProjectId(sess.activeProjectId || proj[0]?.id);
          setScreen("dashboard");
          setHistory(["dashboard"]);
        } else {
          setActiveProjectId(proj[0]?.id);
        }
      } catch (e) {
        // fresh state if storage fails
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.storage.set("rendix:projects", JSON.stringify(projects), false).catch(() => {});
  }, [projects, ready]);
  useEffect(() => {
    if (!ready) return;
    window.storage.set("rendix:expenses", JSON.stringify(expenses), false).catch(() => {});
  }, [expenses, ready]);
  useEffect(() => {
    if (!ready) return;
    if (user) {
      window.storage.set("rendix:session", JSON.stringify({ user, activeProjectId }), false).catch(() => {});
    }
  }, [user, activeProjectId, ready]);

  // ---------------- navigation ----------------
  const go = (s) => {
    setScreen(s);
    setHistory((h) => [...h, s]);
  };
  const back = () => {
    setHistory((h) => {
      if (h.length <= 1) return h;
      const next = h.slice(0, -1);
      setScreen(next[next.length - 1]);
      return next;
    });
  };

  // ---------------- derived data ----------------
  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const projectExpenses = (pid) => expenses.filter((e) => e.proyectoId === pid);

  const saldoDisponible = (pid) => {
    const proj = projects.find((p) => p.id === pid);
    if (!proj) return 0;
    const gastado = projectExpenses(pid).reduce((s, e) => s + (e.monto || 0), 0);
    return proj.presupuesto - gastado;
  };
  const totalGastado = (pid) => projectExpenses(pid).reduce((s, e) => s + (e.monto || 0), 0);
  const pendingCount = activeProject ? projectExpenses(activeProject.id).filter((e) => e.estado === "diferido").length : 0;

  // ---------------- actions ----------------
  const handleLogin = (name) => {
    const u = { name: name || "Usuario Rendix", email: "usuario@rendix.app" };
    setUser(u);
    setScreen("dashboard");
    setHistory(["dashboard"]);
  };

  const handleLogout = () => {
    window.storage.delete("rendix:session", false).catch(() => {});
    setUser(null);
    setScreen("login");
    setHistory(["login"]);
  };

  const startCapture = () => {
    setCapturedReceipt(null);
    setDraft(null);
    setEditingId(null);
    go("capture");
  };

  const takePhoto = () => {
    const sample = RECEIPT_BANK[Math.floor(Math.random() * RECEIPT_BANK.length)];
    setCapturedReceipt(sample);
    go("processing");
    setTimeout(() => {
      setDraft({
        comercio: sample.comercio,
        monto: sample.monto,
        fecha: todayISO(),
        tipo_documento: sample.tipo_documento,
        confMonto: sample.confMonto,
        confFecha: sample.confFecha,
        confComercio: sample.confComercio,
      });
      setHistory((h) => {
        const next = [...h];
        next[next.length - 1] = "confirm";
        return next;
      });
      setScreen("confirm");
    }, 1400);
  };

  const openEdit = (expenseId) => {
    const e = expenses.find((x) => x.id === expenseId);
    if (!e) return;
    setEditingId(expenseId);
    setCapturedReceipt({ tipo_documento: e.tipo_documento || "boleta" });
    setDraft({
      comercio: e.comercio || "",
      monto: e.monto || "",
      fecha: e.fecha || "",
      tipo_documento: e.tipo_documento || "boleta",
      confMonto: 1, confFecha: 1, confComercio: 1,
    });
    go("confirm");
  };

  const saveExpense = (estadoFinal) => {
    if (!draft || !draft.monto || Number(draft.monto) <= 0) {
      showToast("Ingresa un monto válido antes de guardar", "error");
      return;
    }
    if (estadoFinal === "confirmado" && (!draft.comercio || !draft.fecha || !draft.tipo_documento)) {
      showToast("Para confirmar, completa comercio, fecha y tipo de documento", "error");
      return;
    }
    if (editingId) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === editingId
            ? { ...e, ...draft, monto: Number(draft.monto), estado: estadoFinal }
            : e
        )
      );
      showToast(estadoFinal === "confirmado" ? "Gasto actualizado" : "Guardado como pendiente");
    } else {
      const newExpense = {
        id: uid(),
        proyectoId: activeProject.id,
        monto: Number(draft.monto),
        fecha: draft.fecha || null,
        comercio: draft.comercio || null,
        tipo_documento: draft.tipo_documento || null,
        estado: estadoFinal,
        creado: Date.now(),
      };
      setExpenses((prev) => [newExpense, ...prev]);
      showToast(estadoFinal === "confirmado" ? "Gasto registrado" : "Guardado como pendiente");
    }
    setDraft(null);
    setEditingId(null);
    setHistory(["dashboard"]);
    setScreen("dashboard");
  };

  const deleteExpense = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setConfirmDelete(null);
    showToast("Gasto eliminado y saldo restituido");
    back();
  };

  const createProject = (p) => {
    const proj = { id: uid(), estado: "activo", responsable: "Tú", ...p };
    setProjects((prev) => [...prev, proj]);
    setActiveProjectId(proj.id);
    setNewProjectDraft(null);
    showToast("Proyecto creado");
    setHistory(["dashboard"]);
    setScreen("dashboard");
  };

  // El saldo disponible es siempre presupuesto - gastos (regla de negocio del proyecto).
  // Para permitir editar el saldo directamente sin romper esa fórmula, al guardar un
  // nuevo saldo recalculamos el presupuesto total = saldo deseado + gastos ya registrados.
  const updateSaldo = (nuevoSaldo) => {
    if (!activeProject) return;
    const gastadoActual = totalGastado(activeProject.id);
    const nuevoPresupuesto = Number(nuevoSaldo) + gastadoActual;
    setProjects((prev) =>
      prev.map((p) => (p.id === activeProject.id ? { ...p, presupuesto: nuevoPresupuesto } : p))
    );
    setEditingSaldo(false);
    showToast("Saldo disponible actualizado");
  };

  // ---------------- filtered history ----------------
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.proyectoId === activeProjectId || filters.tipo === "todos-proyectos")
      .filter((e) => (filters.estado === "todos" ? true : e.estado === filters.estado))
      .filter((e) => (filters.tipo === "todos" || filters.tipo === "todos-proyectos" ? true : e.tipo_documento === filters.tipo))
      .filter((e) => (filters.q ? (e.comercio || "").toLowerCase().includes(filters.q.toLowerCase()) : true))
      .filter((e) => (filters.desde ? (e.fecha || "9999") >= filters.desde : true))
      .filter((e) => (filters.hasta ? (e.fecha || "0000") <= filters.hasta : true))
      .sort((a, b) => b.creado - a.creado);
  }, [expenses, activeProjectId, filters]);

  // ---------------- render ----------------
  if (!ready) {
    return (
      <PhoneShell t={t}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin" color={t.teal} size={28} />
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell t={t}>
      {screen === "login" && <LoginScreen t={t} onLogin={handleLogin} dark={dark} setDark={setDark} />}

      {screen === "dashboard" && activeProject && (
        <DashboardScreen
          t={t}
          project={activeProject}
          projects={projects}
          saldo={saldoDisponible(activeProject.id)}
          gastado={totalGastado(activeProject.id)}
          countGastos={projectExpenses(activeProject.id).filter((e) => e.estado === "confirmado").length}
          countPendientes={pendingCount}
          onRegistrar={startCapture}
          onSwitchProject={() => go("projects")}
          onPendientesClick={() => { setFilters((f) => ({ ...f, estado: "diferido" })); go("history"); }}
          onGastosClick={() => { setFilters((f) => ({ ...f, estado: "confirmado" })); go("history"); }}
          onEditSaldo={() => setEditingSaldo(true)}
        />
      )}

      {screen === "projects" && (
        <ProjectsScreen
          t={t}
          projects={projects}
          activeProjectId={activeProjectId}
          onBack={back}
          onSelect={(id) => { setActiveProjectId(id); back(); }}
          onNew={() => { setNewProjectDraft({ nombre: "", cliente: "", presupuesto: "", fechaInicio: todayISO(), fechaTermino: "" }); go("newProject"); }}
        />
      )}

      {screen === "newProject" && newProjectDraft && (
        <NewProjectScreen t={t} draft={newProjectDraft} setDraft={setNewProjectDraft} onBack={back} onCreate={createProject} />
      )}

      {screen === "capture" && (
        <CaptureScreen t={t} onBack={back} onShoot={takePhoto} />
      )}

      {screen === "processing" && (
        <ProcessingScreen t={t} />
      )}

      {screen === "confirm" && draft && (
        <ConfirmScreen
          t={t}
          draft={draft}
          setDraft={setDraft}
          tipoDoc={capturedReceipt?.tipo_documento}
          isEdit={!!editingId}
          onBack={() => { setDraft(null); setEditingId(null); back(); }}
          onSave={() => saveExpense("confirmado")}
          onSavePending={() => saveExpense("diferido")}
          onDelete={editingId ? () => setConfirmDelete(editingId) : null}
        />
      )}

      {screen === "history" && (
        <HistoryScreen
          t={t}
          project={activeProject}
          expenses={filteredExpenses}
          filters={filters}
          setFilters={setFilters}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          onOpen={openEdit}
        />
      )}

      {screen === "profile" && (
        <ProfileScreen t={t} user={user} dark={dark} setDark={setDark} onLogout={handleLogout} project={activeProject} projects={projects} />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          t={t}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteExpense(confirmDelete)}
        />
      )}

      {editingSaldo && activeProject && (
        <EditSaldoModal
          t={t}
          saldoActual={saldoDisponible(activeProject.id)}
          gastado={totalGastado(activeProject.id)}
          onCancel={() => setEditingSaldo(false)}
          onSave={updateSaldo}
        />
      )}

      <Toast toast={toast} t={t} />
      {["dashboard", "history", "profile"].includes(screen) && (
        <BottomNav screen={screen} go={(s) => { setHistory([s]); setScreen(s); }} t={t} pendingCount={pendingCount} />
      )}
    </PhoneShell>
  );
}

/* ==================================================================
   SHELL
   ================================================================== */

function PhoneShell({ t, children }) {
  return (
    <div
      className="w-full flex items-center justify-center"
      style={{ background: `radial-gradient(circle at 50% 0%, ${t.navySoft}22, transparent 60%), ${t.bg === "#0E1524" ? "#05070C" : "#E7ECEB"}`, minHeight: 720, padding: "28px 12px" }}
    >
      <div
        className="relative overflow-hidden flex flex-col"
        style={{
          width: 375,
          height: 780,
          backgroundColor: t.bg,
          borderRadius: 44,
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.45)",
          border: `10px solid ${t.bg === "#0E1524" ? "#000" : "#1B1F27"}`,
        }}
      >
        <div className="flex items-center justify-between px-6 pt-2 pb-1 text-[11px] font-semibold" style={{ color: t.text }}>
          <span>9:41</span>
          <div className="flex gap-1 items-center">
            <div style={{ width: 16, height: 10, border: `1.4px solid ${t.text}`, borderRadius: 2 }} />
          </div>
        </div>
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

/* ==================================================================
   LOGIN
   ================================================================== */

function LoginScreen({ t, onLogin, dark, setDark }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  return (
    <div className="flex-1 flex flex-col px-7 justify-center" style={{ backgroundColor: t.bg }}>
      <button
        onClick={() => setDark(!dark)}
        className="absolute top-3 right-5 p-2 rounded-full"
        style={{ backgroundColor: t.surface }}
      >
        {dark ? <Sun size={16} color={t.amber} /> : <Moon size={16} color={t.navy} />}
      </button>

      <div className="mb-9 flex flex-col items-center">
        <div
          className="flex items-center justify-center mb-4"
          style={{ width: 64, height: 64, borderRadius: 20, background: `linear-gradient(155deg, ${t.teal}, ${t.navy})` }}
        >
          <Wallet size={30} color="#fff" strokeWidth={1.8} />
        </div>
        <h1 className="text-[22px] font-bold" style={{ color: t.navy }}>Rendix Starter</h1>
        <p className="text-[13px] mt-1 text-center" style={{ color: t.gray }}>
          Registra un gasto en 15 segundos.<br />Sin planillas, sin boletas perdidas.
        </p>
      </div>

      <TextField label="Correo" icon={User} t={t}>
        <input style={inputStyle(t)} placeholder="tucorreo@empresa.cl" value={email} onChange={(e) => setEmail(e.target.value)} />
      </TextField>
      <TextField label="Contraseña" t={t}>
        <input style={inputStyle(t)} type="password" placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)} />
      </TextField>

      <button
        onClick={() => onLogin(email ? email.split("@")[0] : "")}
        className="mt-2 py-3.5 rounded-2xl font-semibold text-[15px]"
        style={{ backgroundColor: t.teal, color: "#fff" }}
      >
        Iniciar sesión
      </button>
      <p className="text-center text-[12px] mt-4" style={{ color: t.grayLight }}>
        Prototipo — cualquier correo y clave funcionan
      </p>
    </div>
  );
}

/* ==================================================================
   DASHBOARD
   ================================================================== */

function DashboardScreen({ t, project, projects, saldo, gastado, countGastos, countPendientes, onRegistrar, onSwitchProject, onPendientesClick, onGastosClick, onEditSaldo }) {
  const pct = Math.max(0, Math.min(100, (gastado / project.presupuesto) * 100));
  const critico = saldo < project.presupuesto * 0.1;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto pb-20" style={{ backgroundColor: t.bg }}>
      <div className="px-5 pt-3 pb-2 flex items-center justify-between">
        <button onClick={onSwitchProject} className="flex items-center gap-1.5 max-w-[85%]">
          <FolderKanban size={15} color={t.teal} />
          <span className="text-[13px] font-semibold truncate" style={{ color: t.text }}>{project.nombre}</span>
          {projects.length > 1 && <ChevronRight size={14} color={t.gray} />}
        </button>
      </div>

      <div className="px-5">
        <div
          className="rounded-3xl p-5 mb-4"
          style={{ background: `linear-gradient(155deg, ${t.navy}, ${t.navySoft})` }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Wallet size={13} color="#C9D3E4" />
              <span className="text-[12px] font-medium" style={{ color: "#C9D3E4" }}>Saldo disponible</span>
            </div>
            <button
              onClick={onEditSaldo}
              className="flex items-center gap-1 rounded-full px-2 py-1"
              style={{ backgroundColor: "#ffffff1f" }}
            >
              <Pencil size={11} color="#fff" />
              <span className="text-[10.5px] font-semibold text-white">Editar</span>
            </button>
          </div>
          <div className="text-[34px] font-bold text-white leading-tight">{fmtCLP(saldo)}</div>
          {critico && (
            <div className="flex items-center gap-1 mt-1.5">
              <AlertTriangle size={12} color={t.amber} />
              <span className="text-[11px] font-medium" style={{ color: t.amber }}>Saldo bajo — queda menos del 10% del presupuesto</span>
            </div>
          )}

          <div className="mt-4 h-1.5 rounded-full w-full" style={{ backgroundColor: "#ffffff22" }}>
            <div className="h-1.5 rounded-full" style={{ width: pct + "%", backgroundColor: critico ? t.amber : t.teal }} />
          </div>
          <div className="flex justify-between mt-2 text-[11px]" style={{ color: "#C9D3E4" }}>
            <span>Gastado {fmtCLP(gastado)}</span>
            <span>Presupuesto {fmtCLP(project.presupuesto)}</span>
          </div>
        </div>

        <div className="flex gap-3 mb-5">
          <button
            onClick={onGastosClick}
            className="flex-1 rounded-2xl p-3.5 text-left"
            style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[20px] font-bold" style={{ color: t.text }}>{countGastos}</div>
              <ChevronRight size={14} color={t.gray} />
            </div>
            <div className="text-[11.5px] font-medium" style={{ color: t.gray }}>Gastos registrados</div>
          </button>
          <button
            onClick={onPendientesClick}
            className="flex-1 rounded-2xl p-3.5 text-left"
            style={{ backgroundColor: countPendientes > 0 ? t.amberSoft : t.surface, border: `1px solid ${countPendientes > 0 ? t.amber + "55" : t.border}` }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[20px] font-bold" style={{ color: countPendientes > 0 ? t.amber : t.text }}>{countPendientes}</div>
              <ChevronRight size={14} color={countPendientes > 0 ? t.amber : t.gray} />
            </div>
            <div className="text-[11.5px] font-medium" style={{ color: countPendientes > 0 ? t.amber : t.gray }}>Pendientes por completar</div>
          </button>
        </div>
      </div>

      <div className="flex-1" />

      <div className="px-5 pb-3">
        <button
          onClick={onRegistrar}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-[16px]"
          style={{ backgroundColor: t.teal, color: "#fff", boxShadow: `0 10px 24px -8px ${t.teal}99` }}
        >
          <Camera size={20} strokeWidth={2.2} />
          Registrar gasto
        </button>
      </div>
    </div>
  );
}

/* ==================================================================
   PROJECTS
   ================================================================== */

function ProjectsScreen({ t, projects, activeProjectId, onBack, onSelect, onNew }) {
  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: t.bg }}>
      <TopBar title="Tus proyectos" onBack={onBack} t={t} />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="w-full text-left rounded-2xl p-4 mb-3 flex items-center gap-3"
            style={{
              backgroundColor: t.surface,
              border: `1.5px solid ${p.id === activeProjectId ? t.teal : t.border}`,
            }}
          >
            <div
              className="flex items-center justify-center rounded-xl shrink-0"
              style={{ width: 42, height: 42, backgroundColor: t.tealSoft }}
            >
              <FolderKanban size={19} color={t.teal} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold truncate" style={{ color: t.text }}>{p.nombre}</div>
              <div className="text-[12px] truncate" style={{ color: t.gray }}>{p.cliente}</div>
            </div>
            {p.id === activeProjectId && <Check size={18} color={t.teal} strokeWidth={2.6} />}
          </button>
        ))}

        <button
          onClick={onNew}
          className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 mt-1"
          style={{ border: `1.5px dashed ${t.grayLight}`, color: t.gray }}
        >
          <Plus size={16} /> <span className="text-[13.5px] font-semibold">Nuevo proyecto</span>
        </button>
      </div>
    </div>
  );
}

function NewProjectScreen({ t, draft, setDraft, onBack, onCreate }) {
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });
  const valid = draft.nombre && draft.cliente && Number(draft.presupuesto) > 0 && draft.fechaInicio && draft.fechaTermino;
  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: t.bg }}>
      <TopBar title="Nuevo proyecto" onBack={onBack} t={t} />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <TextField label="Nombre del proyecto" icon={FolderKanban} t={t}>
          <input style={inputStyle(t)} value={draft.nombre} onChange={set("nombre")} placeholder="Ej: Gira Regional 2026" />
        </TextField>
        <TextField label="Cliente" icon={Building2} t={t}>
          <input style={inputStyle(t)} value={draft.cliente} onChange={set("cliente")} placeholder="Nombre del cliente" />
        </TextField>
        <TextField label="Presupuesto total" icon={DollarSign} t={t}>
          <input style={inputStyle(t)} type="number" value={draft.presupuesto} onChange={set("presupuesto")} placeholder="0" />
        </TextField>
        <div className="flex gap-3">
          <div className="flex-1">
            <TextField label="Fecha inicio" icon={Calendar} t={t}>
              <input style={inputStyle(t)} type="date" value={draft.fechaInicio} onChange={set("fechaInicio")} />
            </TextField>
          </div>
          <div className="flex-1">
            <TextField label="Fecha término" icon={Calendar} t={t}>
              <input style={inputStyle(t)} type="date" value={draft.fechaTermino} onChange={set("fechaTermino")} />
            </TextField>
          </div>
        </div>
      </div>
      <div className="px-5 pb-6">
        <button
          disabled={!valid}
          onClick={() => onCreate({ ...draft, presupuesto: Number(draft.presupuesto) })}
          className="w-full py-3.5 rounded-2xl font-semibold text-[15px]"
          style={{ backgroundColor: valid ? t.teal : t.grayLight, color: "#fff" }}
        >
          Crear proyecto
        </button>
      </div>
    </div>
  );
}

/* ==================================================================
   CAPTURE / PROCESSING
   ================================================================== */

function CaptureScreen({ t, onBack, onShoot }) {
  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: "#0B0E14" }}>
      <div className="flex items-center justify-between px-4 pt-3">
        <button onClick={onBack} className="p-2 rounded-full" style={{ backgroundColor: "#ffffff22" }}>
          <X size={18} color="#fff" />
        </button>
        <span className="text-[13px] font-medium text-white/80">Encuadra la boleta o factura</span>
        <div style={{ width: 34 }} />
      </div>

      <div className="flex-1 flex items-center justify-center px-8">
        <div
          className="w-full aspect-[3/4] rounded-2xl relative"
          style={{ border: "2.5px dashed #ffffff55" }}
        >
          <div className="absolute -top-1 -left-1 w-7 h-7 border-t-4 border-l-4 rounded-tl-xl" style={{ borderColor: "#fff" }} />
          <div className="absolute -top-1 -right-1 w-7 h-7 border-t-4 border-r-4 rounded-tr-xl" style={{ borderColor: "#fff" }} />
          <div className="absolute -bottom-1 -left-1 w-7 h-7 border-b-4 border-l-4 rounded-bl-xl" style={{ borderColor: "#fff" }} />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 border-b-4 border-r-4 rounded-br-xl" style={{ borderColor: "#fff" }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Receipt size={40} color="#ffffff33" />
          </div>
        </div>
      </div>

      <div className="pb-9 pt-4 flex items-center justify-center">
        <button
          onClick={onShoot}
          className="rounded-full flex items-center justify-center"
          style={{ width: 74, height: 74, backgroundColor: "#fff", border: "5px solid #ffffff55" }}
        >
          <div className="rounded-full" style={{ width: 58, height: 58, backgroundColor: "#fff", border: "2px solid #0B0E14" }} />
        </button>
      </div>
    </div>
  );
}

function ProcessingScreen({ t }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: t.bg }}>
      <Loader2 className="animate-spin" size={30} color={t.teal} />
      <div className="text-center px-10">
        <div className="text-[14.5px] font-semibold" style={{ color: t.text }}>Leyendo el documento…</div>
        <div className="text-[12.5px] mt-1" style={{ color: t.gray }}>Detectando monto, fecha, comercio y tipo de documento</div>
      </div>
    </div>
  );
}

/* ==================================================================
   CONFIRM
   ================================================================== */

function ConfirmScreen({ t, draft, setDraft, tipoDoc, isEdit, onBack, onSave, onSavePending, onDelete }) {
  // Al editar manualmente un campo, el usuario ya lo validó: se limpia la marca de confianza baja/media de ESE campo.
  const setMonto = (e) => setDraft({ ...draft, monto: e.target.value, confMonto: 1 });
  const setFecha = (e) => setDraft({ ...draft, fecha: e.target.value, confFecha: 1 });
  const setComercio = (e) => setDraft({ ...draft, comercio: e.target.value, confComercio: 1 });
  const anyLow = [draft.confMonto, draft.confFecha, draft.confComercio].some((c) => c < CONF_HIGH);

  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: t.bg }}>
      <TopBar
        title={isEdit ? "Editar gasto" : "Confirmar gasto"}
        onBack={onBack}
        t={t}
        right={onDelete ? (
          <button onClick={onDelete} className="p-2 -mr-1"><Trash2 size={17} color={t.red} /></button>
        ) : null}
      />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="flex items-center gap-3 mb-5">
          <ReceiptThumb tipo={draft.tipo_documento || tipoDoc} size={64} t={t} />
          <div>
            <div className="text-[13px] font-semibold" style={{ color: t.text }}>
              {isEdit ? "Documento guardado" : "Foto capturada"}
            </div>
            {!isEdit && anyLow && (
              <div className="text-[11.5px] flex items-center gap-1 mt-0.5" style={{ color: t.amber }}>
                <CircleAlert size={12} /> Revisa los campos marcados
              </div>
            )}
          </div>
        </div>

        <TextField label="Monto" icon={DollarSign} t={t} confLevelValue={!isEdit ? confLevel(draft.confMonto) : null}>
          <div className="relative">
            <input
              style={inputStyle(t, !isEdit ? confLevel(draft.confMonto) : "high")}
              type="number"
              value={draft.monto}
              onChange={setMonto}
              placeholder="0"
            />
          </div>
        </TextField>

        <TextField label="Fecha" icon={Calendar} t={t} confLevelValue={!isEdit ? confLevel(draft.confFecha) : null}>
          <input style={inputStyle(t, !isEdit ? confLevel(draft.confFecha) : "high")} type="date" value={draft.fecha || ""} onChange={setFecha} />
        </TextField>

        <TextField label="Comercio" icon={Building2} t={t} confLevelValue={!isEdit ? confLevel(draft.confComercio) : null}>
          <input style={inputStyle(t, !isEdit ? confLevel(draft.confComercio) : "high")} value={draft.comercio || ""} onChange={setComercio} placeholder="Nombre del comercio" />
        </TextField>

        <TextField label="Tipo de documento" t={t}>
          <div className="flex gap-2">
            {["boleta", "factura"].map((opt) => (
              <button
                key={opt}
                onClick={() => setDraft({ ...draft, tipo_documento: opt })}
                className="flex-1 py-2.5 rounded-xl text-[13.5px] font-semibold capitalize"
                style={{
                  backgroundColor: draft.tipo_documento === opt ? t.teal : t.surface,
                  color: draft.tipo_documento === opt ? "#fff" : t.text,
                  border: `1.5px solid ${draft.tipo_documento === opt ? t.teal : t.border}`,
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </TextField>

        <div className="rounded-xl px-3.5 py-3 flex gap-2 items-start" style={{ backgroundColor: t.tealSoft }}>
          <CircleCheck size={15} color={t.teal} className="mt-0.5 shrink-0" />
          <span className="text-[11.5px] leading-snug" style={{ color: t.navy }}>
            El monto se descuenta del saldo del proyecto de inmediato, sea que guardes el gasto confirmado o como pendiente.
          </span>
        </div>
      </div>

      <div className="px-5 pb-6 pt-2 flex flex-col gap-2" style={{ backgroundColor: t.bg }}>
        <button onClick={onSave} className="w-full py-3.5 rounded-2xl font-semibold text-[15px]" style={{ backgroundColor: t.teal, color: "#fff" }}>
          Guardar
        </button>
        {!isEdit && (
          <button onClick={onSavePending} className="w-full py-3 rounded-2xl font-semibold text-[14px]" style={{ backgroundColor: t.amberSoft, color: t.amber }}>
            Guardar como pendiente
          </button>
        )}
      </div>
    </div>
  );
}

/* ==================================================================
   HISTORY
   ================================================================== */

function HistoryScreen({ t, project, expenses, filters, setFilters, showFilters, setShowFilters, onOpen }) {
  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: t.bg }}>
      <TopBar title="Historial" t={t} />
      <div className="px-5 pt-3 pb-2 flex gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl px-3" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
          <Search size={15} color={t.gray} />
          <input
            className="flex-1 py-2.5 text-[13.5px] bg-transparent outline-none"
            style={{ color: t.text }}
            placeholder="Buscar comercio…"
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center rounded-xl px-3"
          style={{ backgroundColor: showFilters ? t.teal : t.surface, border: `1px solid ${showFilters ? t.teal : t.border}` }}
        >
          <SlidersHorizontal size={16} color={showFilters ? "#fff" : t.text} />
        </button>
      </div>

      {showFilters && (
        <div className="px-5 pb-3">
          <div className="rounded-2xl p-3.5" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
            <div className="text-[11.5px] font-semibold mb-2" style={{ color: t.gray }}>ESTADO</div>
            <div className="flex gap-2 mb-3">
              {[["todos", "Todos"], ["confirmado", "Confirmado"], ["diferido", "Diferido"]].map(([val, label]) => (
                <Chip key={val} t={t} active={filters.estado === val} onClick={() => setFilters({ ...filters, estado: val })} label={label} />
              ))}
            </div>
            <div className="text-[11.5px] font-semibold mb-2" style={{ color: t.gray }}>TIPO DE DOCUMENTO</div>
            <div className="flex gap-2 mb-3">
              {[["todos", "Todos"], ["boleta", "Boleta"], ["factura", "Factura"]].map(([val, label]) => (
                <Chip key={val} t={t} active={filters.tipo === val} onClick={() => setFilters({ ...filters, tipo: val })} label={label} />
              ))}
            </div>
            <div className="text-[11.5px] font-semibold mb-2" style={{ color: t.gray }}>RANGO DE FECHAS</div>
            <div className="flex gap-2">
              <input type="date" style={inputStyle(t)} value={filters.desde} onChange={(e) => setFilters({ ...filters, desde: e.target.value })} />
              <input type="date" style={inputStyle(t)} value={filters.hasta} onChange={(e) => setFilters({ ...filters, hasta: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 pb-24">
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt size={30} color={t.grayLight} />
            <div className="text-[13.5px] font-semibold mt-3" style={{ color: t.text }}>Sin resultados</div>
            <div className="text-[12px] mt-1" style={{ color: t.gray }}>Ajusta la búsqueda o los filtros aplicados</div>
          </div>
        ) : (
          expenses.map((e) => (
            <button
              key={e.id}
              onClick={() => onOpen(e.id)}
              className="w-full text-left flex items-center gap-3 rounded-2xl p-3 mb-2.5"
              style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
            >
              <ReceiptThumb tipo={e.tipo_documento} size={48} t={t} />
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold truncate" style={{ color: t.text }}>
                  {e.comercio || "Comercio sin identificar"}
                </div>
                <div className="text-[11.5px]" style={{ color: t.gray }}>{e.fecha ? fmtDate(e.fecha) : "Fecha pendiente"}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[14px] font-bold" style={{ color: t.text }}>{fmtCLP(e.monto)}</span>
                <StatusBadge estado={e.estado} t={t} />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function Chip({ t, active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
      style={{ backgroundColor: active ? t.teal : t.bg, color: active ? "#fff" : t.text, border: `1px solid ${active ? t.teal : t.border}` }}
    >
      {label}
    </button>
  );
}

/* ==================================================================
   PROFILE
   ================================================================== */

function ProfileScreen({ t, user, dark, setDark, onLogout, project, projects }) {
  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: t.bg }}>
      <TopBar title="Perfil" t={t} />
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="flex items-center justify-center rounded-full text-white font-bold text-[18px]"
            style={{ width: 52, height: 52, background: `linear-gradient(155deg, ${t.teal}, ${t.navy})` }}
          >
            {(user?.name || "U")[0].toUpperCase()}
          </div>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: t.text }}>{user?.name}</div>
            <div className="text-[12.5px]" style={{ color: t.gray }}>{user?.email}</div>
          </div>
        </div>

        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium" style={{ color: t.gray }}>Proyectos asignados</span>
            <span className="text-[13px] font-bold" style={{ color: t.text }}>{projects.length}</span>
          </div>
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[13px] font-medium" style={{ color: t.gray }}>Proyecto activo</span>
            <span className="text-[13px] font-bold truncate max-w-[60%]" style={{ color: t.text }}>{project?.nombre}</span>
          </div>
        </div>

        <button
          onClick={() => setDark(!dark)}
          className="w-full flex items-center justify-between rounded-2xl p-4 mb-3"
          style={{ backgroundColor: t.surface, border: `1px solid ${t.border}` }}
        >
          <div className="flex items-center gap-2.5">
            {dark ? <Sun size={17} color={t.amber} /> : <Moon size={17} color={t.navy} />}
            <span className="text-[13.5px] font-semibold" style={{ color: t.text }}>Modo oscuro</span>
          </div>
          <div className="rounded-full" style={{ width: 38, height: 22, backgroundColor: dark ? t.teal : t.border, position: "relative" }}>
            <div className="rounded-full bg-white absolute top-0.5" style={{ width: 18, height: 18, left: dark ? 18 : 2, transition: "left .15s" }} />
          </div>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 rounded-2xl p-4"
          style={{ backgroundColor: t.redSoft }}
        >
          <LogOut size={17} color={t.red} />
          <span className="text-[13.5px] font-semibold" style={{ color: t.red }}>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
}

/* ==================================================================
   MODAL
   ================================================================== */

function EditSaldoModal({ t, saldoActual, gastado, onCancel, onSave }) {
  const [valor, setValor] = useState(String(Math.round(saldoActual)));
  const num = Number(valor);
  const valid = valor !== "" && !Number.isNaN(num);
  const nuevoPresupuesto = valid ? num + gastado : null;

  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: "#00000066" }}>
      <div className="w-full rounded-t-3xl p-6" style={{ backgroundColor: t.surface }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="rounded-full flex items-center justify-center" style={{ width: 38, height: 38, backgroundColor: t.tealSoft }}>
            <Wallet size={17} color={t.teal} />
          </div>
          <div className="text-[15.5px] font-bold" style={{ color: t.text }}>Editar saldo disponible</div>
        </div>
        <p className="text-[12px] mt-1.5 mb-4" style={{ color: t.gray }}>
          Usa esto para reflejar un nuevo depósito, una corrección de presupuesto u otro ajuste. El presupuesto total del proyecto se recalcula automáticamente para que el saldo quede exactamente en el valor que ingreses.
        </p>

        <TextField label="Nuevo saldo disponible" icon={DollarSign} t={t}>
          <input
            style={inputStyle(t, valid ? "high" : "low")}
            type="number"
            autoFocus
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0"
          />
        </TextField>

        <div className="rounded-xl px-3.5 py-3 mb-5" style={{ backgroundColor: t.bg }}>
          <div className="flex justify-between text-[12.5px] mb-1.5">
            <span style={{ color: t.gray }}>Gastos ya registrados</span>
            <span className="font-semibold" style={{ color: t.text }}>{fmtCLP(gastado)}</span>
          </div>
          <div className="flex justify-between text-[12.5px]">
            <span style={{ color: t.gray }}>Nuevo presupuesto total</span>
            <span className="font-semibold" style={{ color: t.text }}>{valid ? fmtCLP(nuevoPresupuesto) : "—"}</span>
          </div>
        </div>

        <button
          disabled={!valid}
          onClick={() => onSave(num)}
          className="w-full py-3.5 rounded-2xl font-semibold text-[14.5px] mb-2"
          style={{ backgroundColor: valid ? t.teal : t.grayLight, color: "#fff" }}
        >
          Guardar nuevo saldo
        </button>
        <button onClick={onCancel} className="w-full py-3.5 rounded-2xl font-semibold text-[14.5px]" style={{ backgroundColor: t.bg, color: t.text }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({ t, onCancel, onConfirm }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ backgroundColor: "#00000066" }}>
      <div className="w-full rounded-t-3xl p-6" style={{ backgroundColor: t.surface }}>
        <div className="flex items-center justify-center mb-3">
          <div className="rounded-full flex items-center justify-center" style={{ width: 46, height: 46, backgroundColor: t.redSoft }}>
            <AlertTriangle size={20} color={t.red} />
          </div>
        </div>
        <div className="text-[15px] font-bold text-center" style={{ color: t.text }}>¿Eliminar este gasto?</div>
        <p className="text-[12.5px] text-center mt-1.5 mb-5" style={{ color: t.gray }}>
          Su monto se restituirá al saldo disponible del proyecto. Esta acción no se puede deshacer.
        </p>
        <button onClick={onConfirm} className="w-full py-3.5 rounded-2xl font-semibold text-[14.5px] mb-2" style={{ backgroundColor: t.red, color: "#fff" }}>
          Eliminar gasto
        </button>
        <button onClick={onCancel} className="w-full py-3.5 rounded-2xl font-semibold text-[14.5px]" style={{ backgroundColor: t.bg, color: t.text }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
