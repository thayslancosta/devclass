import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';

export default function AdminLayout() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();

  async function aoSair() {
    await sair();
    navigate('/login', { replace: true });
  }

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <NavLink
          to="/admin/usuarios"
          className={({ isActive }) => `nav-link${isActive ? ' ativo' : ''}`}
        >
          Usuários
        </NavLink>
        <Button variant="secundario" onClick={aoSair}>
          Sair
        </Button>
        <div className="layout__usuario">{usuario?.nome} (admin)</div>
      </aside>
      <main className="layout__conteudo">
        <Outlet />
      </main>
    </div>
  );
}
