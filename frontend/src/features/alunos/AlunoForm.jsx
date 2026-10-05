import { useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import Field from '../../components/common/Field';
import { ATUALIZAR_ALUNO, CRIAR_ALUNO } from '../../graphql/alunos';
import { GENEROS, mensagemDeErro } from './alunosUtils';
import { atualizarConsultasDeAlunos } from './atualizarConsultas';
import './alunos.css';

const CAMPOS_RESPONSAVEL = ['nomeResponsavel', 'generoResponsavel', 'contatoResponsavel'];
const GENEROS_VALIDOS = GENEROS.map(([valor]) => valor);

function validar(valores) {
  const erros = {};

  if (!valores.nome) erros.nome = 'Informe o nome do aluno.';
  if (!GENEROS_VALIDOS.includes(valores.generoGramatical)) {
    erros.generoGramatical = 'Selecione o gênero gramatical.';
  }
  if (!valores.nomeResponsavel && (valores.generoResponsavel || valores.contatoResponsavel)) {
    erros.nomeResponsavel =
      'Informe o nome do responsável ou use "Remover responsável" para limpar gênero e contato.';
  }

  return erros;
}

// Criação: campos opcionais vazios são omitidos.
function montarInputCriacao(valores) {
  const input = { nome: valores.nome, generoGramatical: valores.generoGramatical };
  CAMPOS_RESPONSAVEL.forEach((campo) => {
    if (valores[campo]) input[campo] = valores[campo];
  });
  return input;
}

// Edição: envia apenas o que mudou. Sem nome de responsável, os três campos
// dependentes são limpos juntos com null, nunca só o nome.
function montarInputEdicao(aluno, valores) {
  const input = {};

  if (valores.nome !== aluno.nome) input.nome = valores.nome;
  if (valores.generoGramatical !== aluno.generoGramatical) {
    input.generoGramatical = valores.generoGramatical;
  }

  if (!valores.nomeResponsavel) {
    const tinhaResponsavel = CAMPOS_RESPONSAVEL.some((campo) => Boolean(aluno[campo]));
    if (tinhaResponsavel) {
      CAMPOS_RESPONSAVEL.forEach((campo) => { input[campo] = null; });
    }
    return input;
  }

  CAMPOS_RESPONSAVEL.forEach((campo) => {
    if (valores[campo] !== (aluno[campo] || '')) input[campo] = valores[campo] || null;
  });
  return input;
}

// Formulário compartilhado por criação e edição do cadastro.
// onSalvo(aluno, { criado, semAlteracoes }) é chamado depois de persistir
// e de atualizar as consultas de alunos que estiverem na tela.
export default function AlunoForm({ aluno, nomeInicial = '', onCancelar, onSalvo }) {
  const client = useApolloClient();
  const [criarAluno] = useMutation(CRIAR_ALUNO);
  const [atualizarAluno] = useMutation(ATUALIZAR_ALUNO);

  const [nome, setNome] = useState(aluno?.nome || nomeInicial);
  const [generoGramatical, setGeneroGramatical] = useState(aluno?.generoGramatical || '');
  const [nomeResponsavel, setNomeResponsavel] = useState(aluno?.nomeResponsavel || '');
  const [generoResponsavel, setGeneroResponsavel] = useState(aluno?.generoResponsavel || '');
  const [contatoResponsavel, setContatoResponsavel] = useState(aluno?.contatoResponsavel || '');
  const [erros, setErros] = useState({});
  const [erroEnvio, setErroEnvio] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const tinhaResponsavel = CAMPOS_RESPONSAVEL.some((campo) => Boolean(aluno?.[campo]));
  const temDadoResponsavel = Boolean(nomeResponsavel.trim() || generoResponsavel || contatoResponsavel.trim());

  function removerResponsavel() {
    setNomeResponsavel('');
    setGeneroResponsavel('');
    setContatoResponsavel('');
    setErros((atuais) => ({ ...atuais, nomeResponsavel: undefined }));
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (salvando) return;
    setErroEnvio(null);

    const valores = {
      nome: nome.trim(),
      generoGramatical,
      nomeResponsavel: nomeResponsavel.trim(),
      generoResponsavel,
      contatoResponsavel: contatoResponsavel.trim(),
    };
    const errosAtuais = validar(valores);
    setErros(errosAtuais);
    if (Object.keys(errosAtuais).length > 0) return;

    setSalvando(true);
    try {
      if (aluno) {
        const input = montarInputEdicao(aluno, valores);
        if (Object.keys(input).length === 0) {
          onSalvo(aluno, { criado: false, semAlteracoes: true });
          return;
        }
        const resposta = await atualizarAluno({ variables: { id: aluno.id, input } });
        await atualizarConsultasDeAlunos(client);
        onSalvo(resposta.data.atualizarAluno, { criado: false });
      } else {
        const resposta = await criarAluno({ variables: { input: montarInputCriacao(valores) } });
        await atualizarConsultasDeAlunos(client);
        onSalvo(resposta.data.criarAluno, { criado: true });
      }
    } catch (erro) {
      // Os dados digitados são mantidos para nova tentativa.
      setErroEnvio(erro);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="aluno-modal-overlay">
      <section
        className="aluno-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-form-aluno"
      >
        <h2 id="titulo-form-aluno">{aluno ? 'Editar cadastro do aluno' : 'Novo aluno'}</h2>
        <form onSubmit={enviar} noValidate>
          {erroEnvio && <ErrorMessage texto={mensagemDeErro(erroEnvio)} />}

          <Field
            id="aluno-nome"
            label="Nome do aluno"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            error={erros.nome}
            maxLength={120}
            required
            autoFocus
          />
          <Field
            id="aluno-genero"
            label="Gênero gramatical"
            as="select"
            value={generoGramatical}
            onChange={(evento) => setGeneroGramatical(evento.target.value)}
            error={erros.generoGramatical}
            required
          >
            <option value="">Selecione</option>
            {GENEROS.map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </Field>
          <p className="aluno-form__ajuda">
            Usado na concordância dos textos sobre o aluno. Informe conforme o aluno; o sistema não
            deduz o gênero pelo nome.
          </p>

          <fieldset className="aluno-form__responsavel">
            <legend>Responsável (opcional)</legend>
            <Field
              id="aluno-responsavel-nome"
              label="Nome do responsável"
              value={nomeResponsavel}
              onChange={(evento) => setNomeResponsavel(evento.target.value)}
              error={erros.nomeResponsavel}
              maxLength={120}
            />
            <div className="aluno-form__linha">
              <Field
                id="aluno-responsavel-genero"
                label="Gênero do responsável"
                as="select"
                value={generoResponsavel}
                onChange={(evento) => setGeneroResponsavel(evento.target.value)}
              >
                <option value="">Não informar</option>
                {GENEROS.map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </Field>
              <Field
                id="aluno-responsavel-contato"
                label="Contato do responsável"
                value={contatoResponsavel}
                onChange={(evento) => setContatoResponsavel(evento.target.value)}
                placeholder="Telefone ou email"
                maxLength={160}
              />
            </div>
            {temDadoResponsavel && (
              <Button variant="secundario" onClick={removerResponsavel} disabled={salvando}>
                Remover responsável
              </Button>
            )}
            {tinhaResponsavel && !temDadoResponsavel && (
              <p className="aluno-form__ajuda" role="status">
                O responsável será removido do cadastro ao salvar (nome, gênero e contato).
              </p>
            )}
          </fieldset>

          <div className="aluno-form__acoes">
            <Button variant="secundario" onClick={onCancelar} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" busy={salvando} disabled={salvando}>
              {aluno ? 'Salvar alterações' : 'Cadastrar aluno'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
