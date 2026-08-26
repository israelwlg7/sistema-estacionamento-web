/* Vaguinha - assistente virtual (CORRIGIDO) */
(function(){
  const chatLog = document.getElementById('chatLog');
  const chatInput = document.getElementById('chatInput');
  const chatForm = document.getElementById('chatForm');
  const chips = document.getElementById('chips');
  
  if(!chatLog || !chatInput || !chatForm){ return; }

  const TOTAL_VAGAS = 18;
  const TARIFA = 8;

  // Função para adicionar as bolhas usando as classes do CSS
  const addMsg = function(txt, who) {
    who = who || 'bot';
    const d = document.createElement('div');
    d.className = 'bubble ' + who;
    d.textContent = txt;
    chatLog.appendChild(d);
    chatLog.scrollTop = chatLog.scrollHeight;
  };

  const reply = function(txt) {
    setTimeout(function(){ addMsg(txt, 'bot'); }, 400);
  };

  const vagasInfo = async function() {
    try{
      const d = await API.get('/api/vagas/');
      const vagas = d.vagas || [];
      const livres = vagas.filter(function(v){ return v.status === 'LIVRE'; }).length;
      const ocup = vagas.filter(function(v){ return v.status === 'OCUPADA'; }).length;
      const res = vagas.filter(function(v){ return v.status === 'RESERVADA'; }).length;
      return {total: vagas.length, livres: livres, ocup: ocup, res: res, vagas: vagas};
    }catch(e){ return null; }
  };

  const handle = async function(txt) {
    const t = txt.toLowerCase().trim();
    if(!t) return;

    if(/^(oi|ol[aá]|ola|hey|hi|bom dia|boa tarde|boa noite)$/.test(t)){
      return reply('Oi! Sou a Vaguinha. Posso olhar o estacionamento em tempo real. Experimenta: "quantas vagas livres?" ou "quero estacionar".');
    }

    if(/quantas.*livre|vagas.*livre|livre.*vaga|tem.*vaga/.test(t)){
      const info = await vagasInfo();
      if(!info) return reply('Não consegui consultar o sistema agora. Tenta de novo.');
      return reply(info.livres + ' de ' + info.total + ' vagas livres (' + info.ocup + ' ocupadas, ' + info.res + ' reservadas).');
    }

    const mVaga = t.match(/vaga\s*(\d+)/);
    if(mVaga){
      const n = parseInt(mVaga[1]);
      if(n < 1 || n > TOTAL_VAGAS) return reply('Só temos vagas de 1 a ' + TOTAL_VAGAS + '.');
      const info = await vagasInfo();
      const v = info.vagas.find(function(x){ return x.numero === n; });
      if(!v) return reply('Vaga ' + n + ' não existe.');
      let r = 'Vaga ' + n + ' (' + v.setor + '): ' + v.status + '.';
      if(v.veiculo) r += ' Veículo: ' + v.veiculo.modelo + ' (' + (v.veiculo.placa || 'sem placa') + ').';
      if(v.status === 'LIVRE') r += ' Quer estacionar? Me diz "quero estacionar na ' + n + '".';
      return reply(r);
    }

    if(/estacionar|parcar|guardar.*carro/.test(t)){
      const m = t.match(/(\d+)/);
      if(m){
        const n = parseInt(m[1]);
        if(n < 1 || n > TOTAL_VAGAS) return reply('Só temos vagas de 1 a ' + TOTAL_VAGAS + '. Digita só o número.');
        return reply('Vou tentar estacionar na vaga ' + n + '. Me confirma: modelo e cor do carro? (ou abre o mapa e clica na vaga).');
      }
      return reply('Bora estacionar! Primeiro, qual o número da vaga? (1 a ' + TOTAL_VAGAS + '), ou abre o mapa e clica nela.');
    }

    if(/pre[cç]o|valor|quanto.*custa|tarifa/.test(t)){
      return reply('A tarifa é R$ ' + TARIFA + ',00 por hora (mínimo 1h). Ex: 2h30 = R$ ' + (TARIFA * 3) + ',00.');
    }

    if(/p[aá]tio|ve[ií]culo.*no|carro.*no|mostrar.*p[aá]tio/.test(t)){
      try{
        const d = await API.get('/api/veiculos/');
        const vs = d.veiculos || [];
        if(!vs.length) return reply('O pátio está vazio agora.');
        let txt = vs.length + ' veículo(s) no pátio:\n';
        vs.slice(0, 8).forEach(function(v){
          txt += '- Vaga ' + (v.vaga || '?') + ': ' + v.modelo + ' (' + (v.placa || 'sem placa') + ')\n';
        });
        if(vs.length > 8) txt += '...e mais ' + (vs.length - 8) + '.';
        return reply(txt);
      }catch(e){ return reply('Não consegui consultar o pátio agora.'); }
    }

    if(/ajuda|help|como.*funciona|o que.*faz/.test(t)){
      return reply('Posso: ver vagas livres, consultar uma vaga específica, estacionar seu carro, informar o preço, mostrar o pátio. É só perguntar!');
    }

    reply('Desculpa, não entendi. Tenta: "quantas vagas livres?", "a vaga 1 tá livre?", "quero estacionar", "qual o preço?" ou "mostrar o pátio".');
  };

  const send = function() {
    const t = chatInput.value.trim();
    if(!t) return;
    addMsg(t, 'user');
    chatInput.value = '';
    handle(t);
  };

  // CORREÇÃO CRUCIAL: O formulário agora impede o reload e chama a função
  chatForm.addEventListener('submit', function(e) {
    e.preventDefault();
    send();
  });

  if(chips){
    const sugestoes = ['Quantas vagas livres?', 'A vaga 1 tá livre?', 'Como estacionar?', 'Qual o preço?', 'Mostrar o pátio'];
    sugestoes.forEach(function(s){
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'chip';
      c.textContent = s;
      c.addEventListener('click', function(){
        chatInput.value = s;
        send();
      });
      chips.appendChild(c);
    });
  }

  // Mensagem de boas-vindas usando o CSS correto
  setTimeout(function(){
    addMsg('Oi! Sou a Vaguinha. Posso olhar o estacionamento em tempo real e até estacionar por você aqui no chat. Experimenta: "a vaga 1 tá livre?" ou "quero estacionar".', 'bot');
  }, 400);
})();