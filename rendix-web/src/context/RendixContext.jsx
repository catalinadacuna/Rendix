import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTheme } from '../theme';
import { supabase } from '../lib/supabaseClient';

const RendixContext = createContext();

const mapProyecto = (row) => ({
  id: row.id,
  nombre: row.nombre,
  cliente: row.cliente,
  presupuesto: Number(row.presupuesto) || 0,
  fechaInicio: row.fecha_inicio,
  fechaTermino: row.fecha_termino,
  informeEnviadoEn: row.informe_enviado_en,
  eliminadoEn: row.eliminado_en,
  creado: row.creado_en,
});

const mapGasto = (row) => ({
  id: row.id,
  proyectoId: row.proyecto_id,
  monto: Number(row.monto) || 0,
  comercio: row.comercio,
  fecha: row.fecha,
  hora: row.hora,
  tipo_documento: row.tipo_documento,
  estado: row.estado,
  fotoUrl: row.foto_url,
  folio: row.folio,
  rutEmisor: row.rut_emisor,
  creado: new Date(row.creado_en).getTime(),
});

export const RendixProvider = ({ children }) => {
  const [proyectos, setProyectos] = useState([]);
  const [proyectosEliminados, setProyectosEliminados] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [userId, setUserId] = useState(null);

  // Modo oscuro: sigue en localStorage porque es preferencia del dispositivo.
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('rendix_dark');
    return saved ? JSON.parse(saved) : false;
  });

  // Avatar, nombre y correo del administrador: viven en Supabase (tabla perfiles).
  const [avatar, setAvatarState] = useState(null);
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [correoAdmin, setCorreoAdminState] = useState('');

  useEffect(() => {
    localStorage.setItem('rendix_dark', JSON.stringify(dark));
  }, [dark]);

  const cargarDatos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setUserId(null);
      setProyectos([]);
      setProyectosEliminados([]);
      setGastos([]);
      setAvatarState(null);
      setNombreUsuario('');
      setCorreoAdminState('');
      setCargando(false);
      return;
    }
    setUserId(user.id);

    const [{ data: activosData }, { data: eliminadosData }, { data: gastosData }, { data: perfilData }] = await Promise.all([
      supabase.from('proyectos').select('*').is('eliminado_en', null).order('creado_en', { ascending: false }),
      supabase.from('proyectos').select('*').not('eliminado_en', 'is', null).order('eliminado_en', { ascending: false }),
      supabase.from('gastos').select('*').order('creado_en', { ascending: false }),
      supabase.from('perfiles').select('avatar_url, nombre, correo_administrador').eq('user_id', user.id).single(),
    ]);

    setProyectos((activosData || []).map(mapProyecto));
    setProyectosEliminados((eliminadosData || []).map(mapProyecto));
    setGastos((gastosData || []).map(mapGasto));
    setAvatarState(perfilData?.avatar_url || null);
    // Si el perfil no tiene nombre, usamos el que quedó en los datos de registro.
    setNombreUsuario(perfilData?.nombre || user.user_metadata?.nombre || '');
    setCorreoAdminState(perfilData?.correo_administrador || '');
    setCargando(false);
  }, []);

  useEffect(() => {
    cargarDatos();
    const { data: listener } = supabase.auth.onAuthStateChange(() => cargarDatos());
    return () => listener.subscription.unsubscribe();
  }, [cargarDatos]);

  const t = getTheme(dark);

  // Actualiza el avatar tanto en el estado local como en la tabla perfiles.
  const setAvatar = async (nuevaRuta) => {
    setAvatarState(nuevaRuta);
    if (!userId) return;
    await supabase.from('perfiles').update({ avatar_url: nuevaRuta }).eq('user_id', userId);
  };

  // Guarda el correo del administrador al que se envian los informes.
  const guardarCorreoAdmin = async (correo) => {
    if (!userId) return false;
    const limpio = (correo || '').trim();
    const { error } = await supabase
      .from('perfiles')
      .update({ correo_administrador: limpio || null })
      .eq('user_id', userId);
    if (error) return false;
    setCorreoAdminState(limpio);
    return true;
  };

  const addProyecto = async (nuevo) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('proyectos')
      .insert({
        owner_id: userId,
        nombre: nuevo.nombre,
        cliente: nuevo.cliente,
        presupuesto: Number(nuevo.presupuesto) || 0,
        fecha_inicio: nuevo.fechaInicio || null,
        fecha_termino: nuevo.fechaTermino || null,
      })
      .select()
      .single();
    if (error) return null;
    const proyecto = mapProyecto(data);
    setProyectos((prev) => [proyecto, ...prev]);
    return proyecto;
  };

  const updateProyecto = async (id, cambios) => {
    const payload = {};
    if (cambios.nombre !== undefined) payload.nombre = cambios.nombre;
    if (cambios.cliente !== undefined) payload.cliente = cambios.cliente;
    if (cambios.presupuesto !== undefined) payload.presupuesto = Number(cambios.presupuesto) || 0;
    if (cambios.fechaInicio !== undefined) payload.fecha_inicio = cambios.fechaInicio;
    if (cambios.fechaTermino !== undefined) payload.fecha_termino = cambios.fechaTermino;

    const { data, error } = await supabase
      .from('proyectos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) return;
    setProyectos((prev) => prev.map((p) => (p.id === id ? mapProyecto(data) : p)));
  };

  const deleteProyecto = async (id) => {
    const { data, error } = await supabase
      .from('proyectos')
      .update({ eliminado_en: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return false;
    setProyectos((prev) => prev.filter((p) => p.id !== id));
    setProyectosEliminados((prev) => [mapProyecto(data), ...prev]);
    return true;
  };

  const restaurarProyecto = async (id) => {
    const { data, error } = await supabase
      .from('proyectos')
      .update({ eliminado_en: null })
      .eq('id', id)
      .select()
      .single();
    if (error) return false;
    setProyectosEliminados((prev) => prev.filter((p) => p.id !== id));
    setProyectos((prev) => [mapProyecto(data), ...prev]);
    return true;
  };

  const marcarInformeEnviado = async (id) => {
    const { data, error } = await supabase
      .from('proyectos')
      .update({ informe_enviado_en: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return false;
    setProyectos((prev) => prev.map((p) => (p.id === id ? mapProyecto(data) : p)));
    return true;
  };

  // Busca si el usuario ya registró una boleta con el mismo folio y RUT.
  // Devuelve el gasto encontrado, o null si no hay duplicado.
  const buscarGastoDuplicado = async (folio, rutEmisor) => {
    if (!userId || !folio || !rutEmisor) return null;
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .eq('folio', folio)
      .eq('rut_emisor', rutEmisor)
      .limit(1);
    if (error || !data || data.length === 0) return null;
    return mapGasto(data[0]);
  };

  // Segunda capa: para boletas sin folio (terminales de pago), buscamos un gasto
  // con el mismo monto, comercio y fecha. Si ademas coincide la hora, es casi seguro
  // que es la misma boleta. Esto solo advierte, no bloquea.
  const buscarGastoSimilar = async (monto, comercio, fecha, hora) => {
    if (!userId || !monto || !comercio || !fecha) return null;
    let consulta = supabase
      .from('gastos')
      .select('*')
      .eq('monto', Number(monto))
      .eq('fecha', fecha)
      .ilike('comercio', comercio);

    if (hora) consulta = consulta.eq('hora', hora);

    const { data, error } = await consulta.limit(1);
    if (error || !data || data.length === 0) return null;
    return mapGasto(data[0]);
  };

  const addGasto = async (nuevo) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from('gastos')
      .insert({
        owner_id: userId,
        proyecto_id: nuevo.proyectoId,
        monto: Number(nuevo.monto) || 0,
        comercio: nuevo.comercio || null,
        fecha: nuevo.fecha || null,
        hora: nuevo.hora || null,
        tipo_documento: nuevo.tipo_documento || null,
        estado: nuevo.estado || 'confirmado',
        foto_url: nuevo.fotoUrl || null,
        folio: nuevo.folio || null,
        rut_emisor: nuevo.rutEmisor || null,
      })
      .select()
      .single();
    if (error) {
      // 23505 = el índice único de la base rechazó la boleta por repetida.
      if (error.code === '23505') return { duplicado: true };
      return null;
    }
    const gasto = mapGasto(data);
    setGastos((prev) => [gasto, ...prev]);
    return gasto;
  };

  const gastosPorProyecto = (proyectoId) => gastos.filter((g) => g.proyectoId === proyectoId);

  const totalGastadoPorProyecto = (proyectoId) =>
    gastosPorProyecto(proyectoId).reduce((sum, g) => sum + (Number(g.monto) || 0), 0);

  return (
    <RendixContext.Provider
      value={{
        proyectos,
        proyectosEliminados,
        addProyecto,
        updateProyecto,
        deleteProyecto,
        restaurarProyecto,
        marcarInformeEnviado,
        gastos,
        addGasto,
        buscarGastoDuplicado,
        buscarGastoSimilar,
        gastosPorProyecto,
        totalGastadoPorProyecto,
        cargando,
        recargar: cargarDatos,
        dark,
        setDark,
        avatar,
        setAvatar,
        nombreUsuario,
        correoAdmin,
        guardarCorreoAdmin,
        t,
      }}
    >
      {children}
    </RendixContext.Provider>
  );
};

export const useRendix = () => useContext(RendixContext);