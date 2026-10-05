import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Field from '../../components/common/Field';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';

export default function CadastroPage() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erroValidacao, setErroValidacao] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  function validar() {
    if (!nome.trim()) return 'Informe seu nome.';
    if (!email.trim()) return 'Informe seu email.';
    if (senha.length < 6) return 'A senha deve ter ao menos 6 caracteres.';
    if (senha !== confirmacao) return 'As senhas não coincidem.';
    return null;
  }

  async function aoEnviar(evento) {
    evento.preventDefault();
    setErro(null);

    const mensagemValidacao = validar();
    setErroValidacao(mensagemValidacao);
    if (mensagemValidacao) return;

    setEnviando(true);
    try {
      await cadastrar({ nome: nome.trim(), email: email.trim(), senha });
      setConcluido(true);
    } catch (e) {
      setErro(e);
    } finally {
      setEnviando(false);
    }
  }

  if (concluido) {
    return (
      <div className="pagina-auth">
        <h1>Conta criada</h1>
        <p>Sua conta de professor foi criada. Entre com seu email e senha para continuar.</p>
        <Button onClick={() => navigate('/login')}>Ir para o login</Button>
      </div>
    );
  }

  return (
    <div className="pagina-auth">
      <h1>Criar conta de professor</h1>
      <form onSubmit={aoEnviar} noValidate>
        {erro && <ErrorMessage erro={erro} />}
        {erroValidacao && <ErrorMessage texto={erroValidacao} />}
        <Field label="Nome" id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Field
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          label="Senha"
          id="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        <Field
          label="Confirmar senha"
          id="confirmacao"
          type="password"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          required
        />
        <Button type="submit" busy={enviando} disabled={enviando}>
          Cadastrar
        </Button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </div>
  );
}
