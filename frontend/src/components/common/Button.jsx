export default function Button({
  children,
  variant = 'primario',
  busy = false,
  disabled = false,
  type = 'button',
  onClick,
  ...rest
}) {
  return (
    <button
      type={type}
      className={`botao botao--${variant}`}
      disabled={disabled || busy}
      aria-busy={busy}
      onClick={onClick}
      {...rest}
    >
      {busy ? 'Enviando...' : children}
    </button>
  );
}
