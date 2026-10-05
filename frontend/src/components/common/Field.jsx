export default function Field({
  label,
  id,
  error,
  as = 'input',
  children,
  ...rest
}) {
  const Tag = as;

  return (
    <div className="campo">
      <label className="campo__label" htmlFor={id}>
        {label}
      </label>
      {as === 'select' ? (
        <Tag id={id} className="campo__input" {...rest}>
          {children}
        </Tag>
      ) : (
        <Tag id={id} className="campo__input" {...rest} />
      )}
      {error && <span className="campo__erro">{error}</span>}
    </div>
  );
}
