import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function NotFoundPage() {
  const { autenticado, usuario } = useAuth();

  const destino = !autenticado ? '/login' : usuario?.perfil === 'admin' ? '/admin/usuarios' : '/turmas';

  return (
    <div className="pagina-auth">
      <h1>Página não encontrada</h1>
      <p>
        <Link to={destino}>Voltar</Link>
      </p>
    </div>
  );
}
