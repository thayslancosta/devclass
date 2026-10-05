import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Field from '../../components/common/Field';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';

export default function LoginPage() {
  const { entrar } = useAuth();
  const navigate = useNavigate();
  const local = useLocation();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    try {
      const usuario = await entrar({ email, senha });
      const destino = local.state?.de || (usuario.perfil === 'admin' ? '/admin/usuarios' : '/turmas');
      navigate(destino, { replace: true });
    } catch (e) {
      setErro(e);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pagina-auth">
      <h1>Entrar no DevClass</h1>
      <form onSubmit={aoEnviar} noValidate>
        {erro && <ErrorMessage erro={erro} />}
        <Field
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Field
          label="Senha"
          id="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          autoComplete="current-password"
        />
        <Button type="submit" busy={enviando} disabled={enviando}>
          Entrar
        </Button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
      </p>
    </div>
  );
}
