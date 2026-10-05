import { useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { INATIVAR_ALUNO, REATIVAR_ALUNO } from '../../graphql/alunos';
import { atualizarConsultasDeAlunos } from './atualizarConsultas';

// Confirmação de inativar/reativar o CADASTRO do aluno. Não altera matrículas:
// a situação do cadastro é independente da situação de cada matrícula.
export default function SituacaoAlunoDialog({ aluno, onFechar, onConcluido, onErro }) {
  const client = useApolloClient();
  const [inativarAluno] = useMutation(INATIVAR_ALUNO);
  const [reativarAluno] = useMutation(REATIVAR_ALUNO);
  const [enviando, setEnviando] = useState(false);

  if (!aluno) return null;

  const inativando = aluno.status === 'ativo';

  async function confirmar() {
    if (enviando) return;
    setEnviando(true);
    try {
      const executar = inativando ? inativarAluno : reativarAluno;
      await executar({ variables: { id: aluno.id } });
      await atualizarConsultasDeAlunos(client);
      onConcluido(aluno, inativando ? 'inativado' : 'reativado');
    } catch (erro) {
      onErro(erro);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ConfirmDialog
      aberto
      titulo={inativando ? 'Inativar cadastro do aluno?' : 'Reativar cadastro do aluno?'}
      descricao={inativando
        ? 'O cadastro de ' + aluno.nome + ' sai das listas operacionais e não poderá receber novas '
          + 'matrículas. Matrículas, registros e feedbacks são preservados. Inativar o cadastro não '
          + 'encerra matrículas: são situações diferentes.'
        : 'O cadastro de ' + aluno.nome + ' volta a ficar ativo e poderá receber novas matrículas. '
          + 'As matrículas não mudam: uma matrícula encerrada continua encerrada.'}
      textoConfirmar={inativando ? 'Inativar cadastro' : 'Reativar cadastro'}
      variantConfirmar={inativando ? 'perigo' : 'primario'}
      busy={enviando}
      onCancelar={onFechar}
      onConfirmar={confirmar}
    />
  );
}
