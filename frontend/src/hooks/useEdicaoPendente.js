import { useContext, useEffect } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';

// Guarda única por tela. Rascunhos vivem na memória do contexto montado.
export default function useEdicaoPendente(pendente, executando, assunto = 'alterações') {
  const { navigator } = useContext(UNSAFE_NavigationContext);
  useEffect(() => {
    if (!pendente && !executando) return;
    const mensagem = executando
      ? 'Há uma operação em andamento. Aguarde antes de sair.'
      : `Há ${assunto} não salvas. Sair e descartar essas alterações?`;
    const confirmar = () => executando ? (window.alert(mensagem), false) : window.confirm(mensagem);
    let logoutConfirmado = false;
    let indice = window.history.state?.idx;
    const originais = { push: navigator.push, replace: navigator.replace };
    for (const metodo of Object.keys(originais)) {
      navigator[metodo] = (...args) => {
        if (logoutConfirmado || confirmar()) {
          originais[metodo].apply(navigator, args);
          indice = window.history.state?.idx;
        }
      };
    }
    const aoVoltar = (evento) => {
      const destino = evento.state?.idx;
      if (destino === indice) return;
      if (!confirmar() && Number.isInteger(indice) && Number.isInteger(destino)) {
        evento.stopImmediatePropagation();
        window.history.go(indice - destino);
      } else indice = destino;
    };
    const aoFechar = (evento) => { evento.preventDefault(); evento.returnValue = ''; };
    const aoSair = (evento) => {
      if (confirmar()) logoutConfirmado = true;
      else evento.preventDefault();
    };
    window.addEventListener('beforeunload', aoFechar);
    window.addEventListener('popstate', aoVoltar, true);
    window.addEventListener('devclass:antes-sair', aoSair);
    return () => {
      Object.assign(navigator, originais);
      window.removeEventListener('beforeunload', aoFechar);
      window.removeEventListener('popstate', aoVoltar, true);
      window.removeEventListener('devclass:antes-sair', aoSair);
    };
  }, [navigator, pendente, executando, assunto]);
}
