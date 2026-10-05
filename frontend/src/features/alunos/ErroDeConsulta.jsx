import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import { mensagemDeErro } from './alunosUtils';

// Repetir a mesma consulta não resolve estes erros.
const CODIGOS_SEM_NOVA_TENTATIVA = ['BAD_USER_INPUT', 'NOT_FOUND', 'FORBIDDEN', 'UNAUTHENTICATED'];

// Erro de consulta com tentativa explícita: nada é repetido automaticamente.
// texto substitui a mensagem padrão quando a tela precisa dar o contexto.
export default function ErroDeConsulta({ erro, texto, onTentarNovamente }) {
  const codigo = erro?.errors?.[0]?.extensions?.code;
  const podeTentar = Boolean(onTentarNovamente) && !CODIGOS_SEM_NOVA_TENTATIVA.includes(codigo);

  return (
    <div className="alunos-erro">
      <ErrorMessage texto={texto || mensagemDeErro(erro)} />
      {podeTentar && (
        <Button variant="secundario" onClick={() => Promise.resolve(onTentarNovamente()).catch(() => {})}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
