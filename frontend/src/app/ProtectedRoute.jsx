import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/common/Loading';
import ErrorMessage from '../components/common/ErrorMessage';
import Button from '../components/common/Button';

// perfilExigido: 'professor' | 'admin' | undefined (qualquer autenticado)
export default function ProtectedRoute({ perfilExigido, children }) {
  const { status, usuario, tentarNovamente } = useAuth();
  const local = useLocation();

  if (status === 'restaurando') {
    return <Loading texto="Verificando sessão..." />;
  }

  if (status === 'erro_rede') {
    return (
      <div className="pagina-auth">
        <ErrorMessage texto="Não foi possível verificar sua sessão. Verifique sua conexão." />
        <Button onClick={tentarNovamente}>Tentar novamente</Button>
      </div>
    );
  }

  if (status !== 'autenticado') {
    return <Navigate to="/login" state={{ de: local.pathname }} replace />;
  }

  if (perfilExigido && usuario?.perfil !== perfilExigido) {
    return (
      <div className="pagina-auth">
        <ErrorMessage texto="Você não tem permissão para acessar esta página." />
      </div>
    );
  }

  return children;
}
