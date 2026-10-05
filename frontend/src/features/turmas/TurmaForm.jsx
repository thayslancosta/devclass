import { useState } from 'react';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import Field from '../../components/common/Field';

const DIAS_SEMANA = [
  ['segunda', 'Segunda-feira'],
  ['terca', 'Terça-feira'],
  ['quarta', 'Quarta-feira'],
  ['quinta', 'Quinta-feira'],
  ['sexta', 'Sexta-feira'],
  ['sabado', 'Sábado'],
  ['domingo', 'Domingo'],
];

const encontroVazio = () => ({ diaSemana: 'segunda', horario: '' });

export default function TurmaForm({
  turma,
  periodoInicial,
  periodos,
  onCancelar,
  onSalvar,
}) {
  const [nome, setNome] = useState(turma?.nome || '');
  const [estagio, setEstagio] = useState(turma?.estagio || '');
  const [periodoLetivo, setPeriodoLetivo] = useState(
    turma?.periodoLetivo || periodoInicial,
  );
  const [encontros, setEncontros] = useState(
    turma?.encontros?.length ? turma.encontros : [encontroVazio()],
  );
  const [erroValidacao, setErroValidacao] = useState('');
  const [erroEnvio, setErroEnvio] = useState(null);
  const [salvando, setSalvando] = useState(false);

  function atualizarEncontro(indice, campo, valor) {
    setEncontros((atuais) =>
      atuais.map((encontro, i) =>
        i === indice ? { ...encontro, [campo]: valor } : encontro,
      ),
    );
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErroValidacao('');
    setErroEnvio(null);

    if (!nome.trim() || !estagio.trim()) {
      setErroValidacao('Preencha o nome e o estágio da turma.');
      return;
    }
    if (!/^\d{4}\.[12]$/.test(periodoLetivo)) {
      setErroValidacao('Selecione um período letivo válido.');
      return;
    }
    if (!encontros.length || encontros.some((item) => !item.diaSemana || !item.horario)) {
      setErroValidacao('Informe pelo menos um encontro com dia e horário.');
      return;
    }

    setSalvando(true);
    try {
      await onSalvar({
        nome: nome.trim(),
        estagio: estagio.trim(),
        periodoLetivo,
        encontros: encontros.map(({ diaSemana, horario }) => ({ diaSemana, horario })),
      });
    } catch (erro) {
      setErroEnvio(erro);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="turma-modal-overlay">
      <section
        className="turma-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-form-turma"
      >
        <h2 id="titulo-form-turma">{turma ? 'Editar turma' : 'Nova turma'}</h2>
        <form onSubmit={enviar}>
          {erroValidacao && <ErrorMessage texto={erroValidacao} />}
          {erroEnvio && <ErrorMessage erro={erroEnvio} />}
          <Field
            id="turma-nome"
            label="Nome da turma"
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            maxLength={120}
            required
          />
          <Field
            id="turma-estagio"
            label="Estágio"
            value={estagio}
            onChange={(evento) => setEstagio(evento.target.value)}
            maxLength={80}
            required
          />

          {turma ? (
            <p className="turma-form__periodo">
              Período letivo <strong>{turma.periodoLetivo}</strong> (não editável)
            </p>
          ) : (
            <Field
              id="turma-periodo"
              label="Período letivo"
              as="select"
              value={periodoLetivo}
              onChange={(evento) => setPeriodoLetivo(evento.target.value)}
              required
            >
              {periodos.map((periodo) => (
                <option key={periodo} value={periodo}>{periodo}</option>
              ))}
            </Field>
          )}

          <fieldset className="turma-form__encontros">
            <legend>Encontros semanais</legend>
            {encontros.map((encontro, indice) => (
              <div className="turma-form__encontro" key={indice}>
                <Field
                  id={'turma-dia-' + indice}
                  label={'Dia do encontro ' + (indice + 1)}
                  as="select"
                  value={encontro.diaSemana}
                  onChange={(evento) => atualizarEncontro(indice, 'diaSemana', evento.target.value)}
                  required
                >
                  {DIAS_SEMANA.map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>{rotulo}</option>
                  ))}
                </Field>
                <Field
                  id={'turma-horario-' + indice}
                  label="Horário"
                  type="time"
                  value={encontro.horario}
                  onChange={(evento) => atualizarEncontro(indice, 'horario', evento.target.value)}
                  required
                />
                <Button
                  variant="secundario"
                  type="button"
                  aria-label={'Remover encontro ' + (indice + 1)}
                  disabled={encontros.length === 1 || salvando}
                  onClick={() => setEncontros((atuais) => atuais.filter((_, i) => i !== indice))}
                >
                  Remover
                </Button>
              </div>
            ))}
            <Button
              variant="secundario"
              type="button"
              disabled={salvando}
              onClick={() => setEncontros((atuais) => [...atuais, encontroVazio()])}
            >
              Adicionar encontro
            </Button>
          </fieldset>

          <div className="turma-form__acoes">
            <Button variant="secundario" type="button" onClick={onCancelar} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" busy={salvando} disabled={salvando}>
              Salvar turma
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
