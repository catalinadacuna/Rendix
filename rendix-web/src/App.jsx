import { useState, useEffect } from 'react';
import { RendixProvider, useRendix } from './context/RendixContext';
import { Login } from './components/Login';
import { CreateAccount } from './components/CreateAccount';
import { RecuperarPassword } from './components/RecuperarPassword';
import { ProjectSelection } from './components/ProjectSelection';
import { Dashboard } from './components/Dashboard';
import { CreateProject } from './components/CreateProject';
import { History } from './components/History';
import { Trash } from './components/Trash';
import Profile from './components/Profile';
import { supabase } from './lib/supabaseClient';

function AppRoutes() {
  const [vista, setVista] = useState('cargando');
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [historialFiltro, setHistorialFiltro] = useState('todos');
  const { proyectos } = useRendix();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setVista(session ? 'seleccion' : 'login');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) setVista('login');
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const navigate = (key) => {
    if (key === 'historial') setHistorialFiltro('todos');
    setVista(key);
  };

  const goToHistorialFiltrado = (estado) => {
    setHistorialFiltro(estado);
    setVista('historial');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setVista('login');
  };

  if (vista === 'cargando') return null;

  return (
    <>
      {vista === 'login' && (
        <Login
          onLoginSuccess={() => setVista('seleccion')}
          onGoToCrearCuenta={() => setVista('crear-cuenta')}
          onGoToRecuperar={() => setVista('recuperar')}
        />
      )}

      {vista === 'crear-cuenta' && (
        <CreateAccount onBack={() => setVista('login')} />
      )}

      {vista === 'recuperar' && (
        <RecuperarPassword onBack={() => setVista('login')} onRecovered={() => setVista('seleccion')} />
      )}

      {vista === 'seleccion' && (
        <ProjectSelection
          onSelectProject={(p) => {
            setProyectoSeleccionado(p);
            setVista('dashboard');
          }}
          onAddNew={() => setVista('crear-proyecto')}
          onBack={handleLogout}
          onGoToTrash={() => setVista('papelera')}
        />
      )}

      {vista === 'papelera' && (
        <Trash onBack={() => setVista('seleccion')} />
      )}

      {vista === 'crear-proyecto' && (
        <CreateProject onBack={() => setVista('seleccion')} />
      )}

      {vista === 'dashboard' && (
        <Dashboard
          proyecto={proyectoSeleccionado}
          onBack={() => setVista('seleccion')}
          go={navigate}
          onGastosClick={() => goToHistorialFiltrado('confirmado')}
          onPendientesClick={() => goToHistorialFiltrado('diferido')}
        />
      )}

      {vista === 'historial' && (
        <History
          proyecto={proyectoSeleccionado}
          onBack={() => setVista('dashboard')}
          go={navigate}
          initialEstado={historialFiltro}
        />
      )}

      {vista === 'perfil' && (
        <Profile
          user={{ name: 'Usuario RendiFácil', email: 'usuario@rendifacil.cl' }}
          projects={proyectos}
          project={proyectoSeleccionado}
          onLogout={handleLogout}
          onBack={() => setVista('dashboard')}
          go={navigate}
        />
      )}
    </>
  );
}

function App() {
  return (
    <RendixProvider>
      <AppRoutes />
    </RendixProvider>
  );
}

export default App;