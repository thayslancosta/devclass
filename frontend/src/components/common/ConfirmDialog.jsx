import Button from './Button';

export default function ConfirmDialog({
  aberto,
  titulo,
  descricao,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  variantConfirmar = 'primario',
  busy = false,
  onConfirmar,
  onCancelar,
}) {
  if (!aberto) return null;

  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true">
      <div className="confirm-dialog">
        <h3>{titulo}</h3>
        {descricao && <p>{descricao}</p>}
        <div className="confirm-dialog__acoes">
          <Button variant="secundario" onClick={onCancelar} disabled={busy}>
            {textoCancelar}
          </Button>
          <Button variant={variantConfirmar} onClick={onConfirmar} busy={busy}>
            {textoConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
