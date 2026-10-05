import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';

export default function ProfessorLayout() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();

  async function aoSair() {
    await sair();
    navigate('/login', { replace: true });
  }

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <NavLink to="/turmas" className={({ isActive }) => `nav-link${isActive ? ' ativo' : ''}`}>
          Turmas
        </NavLink>
        <NavLink to="/alunos" className={({ isActive }) => `nav-link${isActive ? ' ativo' : ''}`}>
          Meus alunos
        </NavLink>
        <Button variant="secundario" onClick={aoSair}>
          Sair
        </Button>
        <div className="layout__usuario">{usuario?.nome}</div>
      </aside>
      <main className="layout__conteudo">
        <Outlet />
      </main>
    </div>
  );
}
