import { createContext, useContext, useMemo, useState } from 'react';

const PeriodoContext = createContext(null);

// jan-jun -> .1 | jul-dez -> .2
export function calcularPeriodoAtual(data = new Date()) {
  const ano = data.getFullYear();
  const mes = data.getMonth() + 1; // 1 a 12
  const semestre = mes <= 6 ? 1 : 2;
  return `${ano}.${semestre}`;
}

export function PeriodoProvider({ children }) {
  const periodoAtual = useMemo(() => calcularPeriodoAtual(), []);
  const [periodoSelecionado, setPeriodoSelecionado] = useState(periodoAtual);

  const valor = {
    periodoAtual,
    periodoSelecionado,
    selecionarPeriodo: setPeriodoSelecionado,
  };

  return <PeriodoContext.Provider value={valor}>{children}</PeriodoContext.Provider>;
}

export function usePeriodo() {
  const contexto = useContext(PeriodoContext);
  if (!contexto) {
    throw new Error('usePeriodo deve ser usado dentro de um PeriodoProvider.');
  }
  return contexto;
}
