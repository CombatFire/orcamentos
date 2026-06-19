let contadorLinhas = 0;
const CHAVE_STORAGE = 'combatfire_catalogo_produtos';
const CHAVE_RASCUNHO = 'combatfire_rascunho_atual';

// Controla se há alterações no orçamento atual que ainda não foram salvas no Google Sheets
let orcamentoTemAlteracoesNaoSalvas = false;
const OPCAO_MANUAL = '__manual__';

// ===== CATÁLOGO DE PRODUTOS (persistido no localStorage do navegador) =====
function carregarCatalogo(){
  try{
    const dados = localStorage.getItem(CHAVE_STORAGE);
    return dados ? JSON.parse(dados) : [];
  }catch(e){
    return [];
  }
}

function salvarCatalogo(lista){
  try{
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(lista));
  }catch(e){
    alert('Não foi possível salvar o catálogo neste navegador.');
  }
}

function formatarMoedaInput(input){
  let valor = input.value.replace(/[^\d,]/g, '');
  input.value = valor;
}

function paraNumero(valorTexto){
  if(!valorTexto) return 0;
  let limpo = valorTexto.replace(/[^\d,]/g, '').replace(',', '.');
  let n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

function paraMoeda(numero){
  return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===== MODAL GERENCIAR PRODUTOS =====
function abrirModalProdutos(){
  renderizarListaProdutos();
  document.getElementById('modal-produtos').classList.add('ativo');
}

function fecharModalProdutos(){
  document.getElementById('modal-produtos').classList.remove('ativo');
  atualizarTodosOsSelects();
}

function renderizarListaProdutos(){
  const catalogo = carregarCatalogo();
  const container = document.getElementById('lista-produtos');

  if(catalogo.length === 0){
    container.innerHTML = '<div class="lista-vazia">Nenhum produto cadastrado ainda. Cadastre o primeiro acima.</div>';
    return;
  }

  container.innerHTML = catalogo.map((produto, idx) => `
    <div class="produto-item">
      <input type="text" class="nome-edit" value="${escapeHtml(produto.nome)}" onchange="editarProduto(${idx}, 'nome', this.value)">
      <input type="text" class="preco-edit" value="${paraMoeda(produto.preco)}" oninput="formatarMoedaInput(this)" onchange="editarProduto(${idx}, 'preco', this.value)">
      <button class="btn-remover-produto" onclick="removerProduto(${idx})" title="Remover produto">✕</button>
    </div>
  `).join('');
}

function escapeHtml(texto){
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function adicionarProduto(){
  const nomeInput = document.getElementById('novo-nome-produto');
  const precoInput = document.getElementById('novo-preco-produto');
  const nome = nomeInput.value.trim();
  const preco = paraNumero(precoInput.value);

  if(!nome){
    alert('Digite o nome do produto/serviço.');
    nomeInput.focus();
    return;
  }

  const catalogo = carregarCatalogo();
  catalogo.push({ nome, preco });
  salvarCatalogo(catalogo);

  nomeInput.value = '';
  precoInput.value = '';
  nomeInput.focus();
  renderizarListaProdutos();
}

function editarProduto(idx, campo, valor){
  const catalogo = carregarCatalogo();
  if(!catalogo[idx]) return;
  catalogo[idx][campo] = campo === 'preco' ? paraNumero(valor) : valor;
  salvarCatalogo(catalogo);
  renderizarListaProdutos();
}

function removerProduto(idx){
  const catalogo = carregarCatalogo();
  catalogo.splice(idx, 1);
  salvarCatalogo(catalogo);
  renderizarListaProdutos();
}

// ===== LINHAS DA TABELA DE ITENS =====
function montarOpcoesSelect(valorSelecionado){
  const catalogo = carregarCatalogo();
  let opcoes = '<option value="">Selecione um produto...</option>';
  catalogo.forEach((produto, idx) => {
    const selecionado = (valorSelecionado === String(idx)) ? 'selected' : '';
    opcoes += `<option value="${idx}" ${selecionado}>${escapeHtml(produto.nome)}</option>`;
  });
  const selecionadoManual = (valorSelecionado === OPCAO_MANUAL) ? 'selected' : '';
  opcoes += `<option value="${OPCAO_MANUAL}" ${selecionadoManual}>✏️ Digitar manualmente...</option>`;
  return opcoes;
}

function criarLinha(){
  contadorLinhas++;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="col-num">${contadorLinhas}</td>
    <td class="celula-descricao">
      <select class="select-produto" onchange="selecionarProduto(this)">
        ${montarOpcoesSelect('')}
      </select>
      <span class="texto-selecionado" style="display:none; cursor:pointer; font-size:13px; color:var(--cinza-texto);" onclick="reabrirSelect(this)" title="Clique para trocar"></span>
      <textarea class="descricao-manual" rows="1" style="display:none;" oninput="autoResize(this)"></textarea>
      <span class="trocar-manual" style="display:none; cursor:pointer; font-size:11px; color:#1a73e8; text-decoration:underline;" onclick="voltarParaSelect(this)" title="Selecionar produto do catálogo">🔄 Selecionar do catálogo</span>
    </td>
    <td><input type="text" class="qtd" value="1" onfocus="var el=this;setTimeout(function(){el.select();},50);" onclick="var el=this;setTimeout(function(){el.select();},50);" oninput="formatarQtd(this); calcularLinha(this)"></td>
    <td><input type="text" class="valor-unit" value="0,00" oninput="formatarMoedaInput(this); calcularLinha(this)"></td>
    <td class="valor-total">R$ 0,00</td>
    <td><button class="btn-remover" onclick="removerLinha(this)" title="Remover item">✕</button></td>
  `;
  return tr;
}

function atualizarTextoPrint(celula, texto){
  const span = celula.querySelector('.texto-selecionado');
  if(span) span.textContent = texto;
}

function reabrirSelect(spanEl){
  const celula = spanEl.closest('.celula-descricao');
  const select = celula.querySelector('select.select-produto');
  spanEl.style.display = 'none';
  select.style.display = '';
  select.focus();
}

function voltarParaSelect(linkEl){
  const celula = linkEl.closest('.celula-descricao');
  const select = celula.querySelector('select.select-produto');
  const textarea = celula.querySelector('textarea.descricao-manual');
  linkEl.style.display = 'none';
  textarea.style.display = 'none';
  select.style.display = '';
  select.focus();
}

function selecionarProduto(selectEl){
  const linha = selectEl.closest('tr');
  const celula = linha.querySelector('.celula-descricao');
  const textarea = linha.querySelector('.descricao-manual');
  const spanSelecionado = celula.querySelector('.texto-selecionado');
  const trocarManual = celula.querySelector('.trocar-manual');
  const valorUnitInput = linha.querySelector('.valor-unit');

  if(selectEl.value === OPCAO_MANUAL){
    selectEl.style.display = 'none';
    spanSelecionado.style.display = 'none';
    textarea.style.display = 'block';
    textarea.value = '';
    textarea.focus();
    valorUnitInput.value = '0,00';
    valorUnitInput.removeAttribute('readonly');
    valorUnitInput.style.background = '';
    spanSelecionado.textContent = '';
    if(trocarManual) trocarManual.style.display = 'inline-block';
    textarea.oninput = function(){ autoResize(this); spanSelecionado.textContent = this.value; calcularLinha(this); };
  } else if(selectEl.value === ''){
    selectEl.style.display = '';
    spanSelecionado.style.display = 'none';
    textarea.style.display = 'none';
    valorUnitInput.value = '0,00';
    valorUnitInput.removeAttribute('readonly');
    valorUnitInput.style.background = '';
    spanSelecionado.textContent = '';
    if(trocarManual) trocarManual.style.display = 'none';
  } else {
    const catalogo = carregarCatalogo();
    const produto = catalogo[parseInt(selectEl.value, 10)];
    textarea.style.display = 'none';
    if(trocarManual) trocarManual.style.display = 'none';
    if(produto){
      valorUnitInput.value = paraMoeda(produto.preco);
      valorUnitInput.setAttribute('readonly', 'readonly');
      valorUnitInput.style.background = '#fdf6e3';
      spanSelecionado.textContent = produto.nome;
      spanSelecionado.style.display = 'block';
      selectEl.style.display = 'none';
    }
  }
  calcularLinha(selectEl);
}

function atualizarTodosOsSelects(){
  document.querySelectorAll('#corpo-tabela select.select-produto').forEach(select => {
    const valorAtual = select.value;
    select.innerHTML = montarOpcoesSelect(valorAtual);
  });
}

function formatarQtd(input){
  let valor = input.value.replace(/[^\d]/g, '');
  input.value = valor;
}

function autoResize(el){
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function adicionarLinha(){
  const corpo = document.getElementById('corpo-tabela');
  corpo.appendChild(criarLinha());
}

function removerLinha(botao){
  const linha = botao.closest('tr');
  linha.remove();
  renumerarLinhas();
  calcularTotais();
}

function renumerarLinhas(){
  const linhas = document.querySelectorAll('#corpo-tabela tr');
  linhas.forEach((linha, idx) => {
    linha.querySelector('.col-num').textContent = idx + 1;
  });
}

function calcularLinha(elemento){
  const linha = elemento.closest('tr');
  const qtd = paraNumero(linha.querySelector('.qtd').value) || 0;
  const valorUnit = paraNumero(linha.querySelector('.valor-unit').value) || 0;
  const total = qtd * valorUnit;
  linha.querySelector('.valor-total').textContent = 'R$ ' + paraMoeda(total);
  calcularTotais();
}

function calcularTotais(){
  let subtotal = 0;
  document.querySelectorAll('#corpo-tabela tr').forEach(linha => {
    const qtd = paraNumero(linha.querySelector('.qtd').value) || 0;
    const valorUnit = paraNumero(linha.querySelector('.valor-unit').value) || 0;
    subtotal += qtd * valorUnit;
  });
  const descontoInput = paraNumero(document.getElementById('desconto').value) || 0;
  const tipoDesconto = document.getElementById('tipo-desconto') ? document.getElementById('tipo-desconto').value : 'valor';
  const desconto = tipoDesconto === 'percentual' ? (subtotal * descontoInput / 100) : descontoInput;
  const total = Math.max(subtotal - desconto, 0);

  document.getElementById('subtotal').value = paraMoeda(subtotal);
  document.getElementById('total-geral').value = paraMoeda(total);
}


function prepararParaImpressao(){
  // Garante sincronização final do texto-print antes de imprimir
  document.querySelectorAll('#corpo-tabela tr').forEach(tr => {
    const celula = tr.querySelector('.celula-descricao');
    if(!celula) return;
    const sel = celula.querySelector('select.select-produto');
    const textarea = celula.querySelector('textarea.descricao-manual');
    const span = celula.querySelector('.texto-selecionado');
    if(!span) return;

    if(sel && sel.value === OPCAO_MANUAL){
      span.textContent = textarea ? textarea.value : '';
    } else if(sel && sel.value !== ''){
      const catalogo = carregarCatalogo();
      const idx = parseInt(sel.value, 10);
      span.textContent = catalogo[idx] ? catalogo[idx].nome : '';
    } else {
      span.textContent = '';
    }
  });
}

function restaurarAposImpressao(){
  // spans são permanentes e reutilizáveis, não precisam ser removidos
}

  window.onbeforeprint = prepararParaImpressao;
  window.onafterprint = restaurarAposImpressao;

function mascararCNPJ(input){
  let v = input.value.replace(/\D/g, '').slice(0, 14);
  if(v.length > 12) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5');
  else if(v.length > 8) v = v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
  else if(v.length > 5) v = v.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
  else if(v.length > 2) v = v.replace(/^(\d{2})(\d{0,3})/, '$1.$2');
  input.value = v;
  if(v.replace(/\D/g,'').length === 14) buscarCNPJ();
}

async function buscarCNPJ(){
  const input = document.getElementById('cli-cnpj');
  const cnpjNumeros = input.value.replace(/\D/g,'');
  if(cnpjNumeros.length !== 14) return;

  const status = document.getElementById('cnpj-status');
  const btn = document.getElementById('btn-buscar-cnpj');
  status.style.display = 'block';
  status.style.color = '#888';
  status.textContent = '⏳ Buscando dados...';
  btn.disabled = true;

  try {
    const res = await fetch('https://brasilapi.com.br/api/cnpj/v1/' + cnpjNumeros);
    if(!res.ok) throw new Error('CNPJ não encontrado');
    const d = await res.json();

    // Razão social ou nome fantasia
    const nome = d.razao_social || d.nome || '';
    document.getElementById('cli-empresa').value = nome;

    // Endereço
    const logradouro = [d.logradouro, d.numero, d.complemento, d.bairro].filter(Boolean).join(', ');
    document.getElementById('cli-endereco').value = logradouro;

    // Cidade - UF
    const cidadeUF = [d.municipio, d.uf].filter(Boolean).join(' - ');
    document.getElementById('cli-cidade').value = cidadeUF;

    // Telefone
    const tel = d.ddd_telefone_1 ? d.ddd_telefone_1.trim() : '';
    if(tel) document.getElementById('cli-telefone').value = '(' + tel.slice(0,2) + ') ' + tel.slice(2);

    // CEP
    if(d.cep){
      const cepLimpo = String(d.cep).replace(/\D/g,'').slice(0,8);
      const cepFormatado = cepLimpo.length === 8
        ? cepLimpo.replace(/^(\d{5})(\d{3})$/, '$1-$2')
        : cepLimpo;
      document.getElementById('cli-cep').value = cepFormatado;
    }

    status.style.color = '#1a7a1a';
    status.textContent = '✅ Dados preenchidos automaticamente. Verifique e ajuste se necessário.';
    setTimeout(() => { status.style.display = 'none'; }, 4000);
  } catch(e) {
    status.style.color = '#b91c1c';
    status.textContent = '❌ ' + (e.message === 'CNPJ não encontrado' ? 'CNPJ não encontrado na Receita Federal.' : 'Erro ao buscar CNPJ. Preencha manualmente.');
    setTimeout(() => { status.style.display = 'none'; }, 5000);
  } finally {
    btn.disabled = false;
  }
}

// ===== CEP AUTO-FILL =====
function mascararCEP(input){
  let v = input.value.replace(/\D/g, '').slice(0, 8);
  if(v.length > 5) v = v.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
  input.value = v;
  if(v.replace(/\D/g,'').length === 8) buscarCEP();
}

async function buscarCEP(){
  const input = document.getElementById('cli-cep');
  const cepNumeros = input.value.replace(/\D/g,'');
  if(cepNumeros.length !== 8) return;

  const status = document.getElementById('cep-status');
  const btn = document.getElementById('btn-buscar-cep');
  status.style.display = 'block';
  status.style.color = '#888';
  status.textContent = '⏳ Buscando endereço...';
  btn.disabled = true;

  try {
    const res = await fetch('https://viacep.com.br/ws/' + cepNumeros + '/json/');
    if(!res.ok) throw new Error('CEP não encontrado');
    const d = await res.json();
    if(d.erro) throw new Error('CEP não encontrado');

    // Preenche endereço (logradouro + bairro)
    const logradouro = [d.logradouro, d.bairro].filter(Boolean).join(', ');
    if(logradouro) document.getElementById('cli-endereco').value = logradouro;

    // Preenche cidade - UF
    const cidadeUF = [d.localidade, d.uf].filter(Boolean).join(' - ');
    if(cidadeUF) document.getElementById('cli-cidade').value = cidadeUF;

    status.style.color = '#1a7a1a';
    status.textContent = '✅ Endereço preenchido. Adicione o número manualmente.';
    setTimeout(() => { status.style.display = 'none'; }, 4000);
  } catch(e) {
    status.style.color = '#b91c1c';
    status.textContent = '❌ CEP não encontrado. Preencha manualmente.';
    setTimeout(() => { status.style.display = 'none'; }, 5000);
  } finally {
    btn.disabled = false;
  }
}

// ===== SALVAR E ABRIR NOVO ORÇAMENTO =====
async function salvarESair(){
  const url = getSheetsUrl();
  if(!url){
    showToast('⚠️ Configure a URL do Google Sheets primeiro (botão ⚙️).', 'info');
    abrirModalSheets();
    return;
  }
  const dados = coletarDadosOrcamento();

  // Validação: nome do cliente obrigatório
  const nomeCliente = document.getElementById('cli-empresa').value.trim();
  if(!nomeCliente){
    showToast('❌ Informe o nome do cliente antes de salvar.', 'erro');
    document.getElementById('cli-empresa').focus();
    return;
  }

  // Validação: pelo menos um item preenchido
  const linhas = document.querySelectorAll('#corpo-tabela tr');
  let temItem = false;
  linhas.forEach(tr => {
    const desc = tr.querySelector('.select-produto')?.value || tr.querySelector('.descricao-manual')?.value?.trim() || '';
    const qtd = parseFloat((tr.querySelector('.qtd')?.value || '0').replace(',','.')) || 0;
    const val = parseFloat((tr.querySelector('.valor-unit')?.value || '0').replace(/\./g,'').replace(',','.')) || 0;
    if(desc && (qtd > 0 || val > 0)) temItem = true;
  });
  if(!temItem){
    showToast('❌ Adicione pelo menos um item ao orçamento antes de salvar.', 'erro');
    return;
  }

  if(!dados.numero){
    showToast('❌ Informe o número do orçamento antes de salvar.', 'erro');
    return;
  }
  showToast('⏳ Salvando no Google Sheets...', 'info');
  try{
    const res = await fetch(url, {
      method:'POST',
      body: JSON.stringify({ action:'salvar', ...dados }),
      headers:{'Content-Type':'text/plain'}
    });
    const d = await res.json();
    if(d.ok){
      orcamentoTemAlteracoesNaoSalvas = false;
      showToast('✅ Orçamento Nº ' + dados.numero + ' salvo! Abrindo novo...', 'ok');
      setTimeout(() => {
        abrirNovoOrcamento(dados.numero);
      }, 1200);
    } else {
      showToast('❌ Erro: ' + (d.msg||'Falha desconhecida'), 'erro');
    }
  }catch(e){
    showToast('❌ Erro de conexão. Verifique a URL do Apps Script.', 'erro');
  }
}

async function abrirNovoOrcamento(numeroAtual){
  // Gera próximo número sequencial, sempre conferindo os números já usados no Sheets
  // (nunca reaproveita um número que já tenha sido salvo anteriormente)
  const proximoNum = await buscarProximoNumeroDisponivel(numeroAtual);

  // Limpa campos do cliente
  document.getElementById('cli-cnpj').value = '';
  document.getElementById('cli-empresa').value = '';
  document.getElementById('cli-cep').value = '';
  document.getElementById('cli-endereco').value = '';
  document.getElementById('cli-cidade').value = '';
  document.getElementById('cli-telefone').value = '';
  document.getElementById('cli-contato').value = '';
  document.getElementById('desconto').value = '0,00';
  if(document.getElementById('tipo-desconto')) document.getElementById('tipo-desconto').value = 'valor';

  // Limpa observações
  document.querySelectorAll('.obs-col textarea').forEach(t => t.value = '');

  // Reseta validade e forma de pagamento
  const metas = document.querySelectorAll('.meta-item');
  if(metas[1]) metas[1].querySelector('input').value = '10 dias';
  const forma = document.querySelector('.meta-item:last-child input');
  if(forma) forma.value = '';

  // Define data de hoje
  const hoje = new Date();
  document.getElementById('data-orcamento').value = hoje.toISOString().split('T')[0];

  // Define próximo número
  document.getElementById('num-orcamento').value = proximoNum;
  salvarNumeroOrcamento(proximoNum);

  // Limpa e recria 3 linhas em branco
  const corpo = document.getElementById('corpo-tabela');
  corpo.innerHTML = '';
  contadorLinhas = 0;
  for(let i=0;i<3;i++) adicionarLinha();
  calcularTotais();

  limparRascunho();
  salvarRascunho();

  orcamentoTemAlteracoesNaoSalvas = false;

  showToast('📄 Novo orçamento Nº ' + proximoNum + ' pronto!', 'ok');
}

function extrairInfoNumero(numero){
  // Identifica o "formato" do número para saber como comparar e formatar corretamente.
  // Suporta formatos: "001/2026", "42", "001", "ORC-001", etc.
  const s = String(numero || '');

  // Formato NNN/AAAA
  const m1 = s.match(/^(\d+)\/(\d{4})$/);
  if(m1) return { tipo:'ano', valor: parseInt(m1[1], 10), digitos: m1[1].length, ano: m1[2] };

  // Formato prefixo + número: "ORC-001", "A-05", "42"
  const m2 = s.match(/^(.*?)(\d+)$/);
  if(m2) return { tipo:'prefixo', valor: parseInt(m2[2], 10), digitos: m2[2].length, prefixo: m2[1] };

  return { tipo:'outro', valor: 0, raw: s };
}

function formatarNumeroComInfo(info, valor){
  if(info.tipo === 'ano') return String(valor).padStart(info.digitos, '0') + '/' + info.ano;
  if(info.tipo === 'prefixo') return info.prefixo + String(valor).padStart(info.digitos, '0');
  return (info.raw || '') + '-' + valor;
}

function mesmoGrupoNumero(a, b){
  if(a.tipo !== b.tipo) return false;
  if(a.tipo === 'ano') return a.ano === b.ano;
  if(a.tipo === 'prefixo') return a.prefixo === b.prefixo;
  return true;
}

// Consulta todos os orçamentos já salvos no Google Sheets e calcula o próximo número
// realmente disponível — nunca um número já utilizado, sempre o maior existente + 1.
async function buscarProximoNumeroDisponivel(numeroAtual){
  const infoAtual = extrairInfoNumero(numeroAtual);
  let maiorValor = infoAtual.valor;

  const url = getSheetsUrl();
  if(url){
    try{
      const res = await fetch(url, {
        method:'POST',
        body: JSON.stringify({action:'listar'}),
        headers:{'Content-Type':'text/plain'}
      });
      const d = await res.json();
      if(d.ok && Array.isArray(d.lista)){
        d.lista.forEach(item => {
          const info = extrairInfoNumero(item.numero);
          if(mesmoGrupoNumero(infoAtual, info) && info.valor > maiorValor){
            maiorValor = info.valor;
          }
        });
      }
    }catch(e){
      // Sem conexão com o Sheets: segue com o fallback local (incrementa o número atual)
    }
  }

  return formatarNumeroComInfo(infoAtual, maiorValor + 1);
}


function salvarNumeroOrcamento(valor){
  try{ localStorage.setItem('combatfire_num_orcamento', valor); } catch(e){}
}

function carregarNumeroOrcamento(){
  try{
    const salvo = localStorage.getItem('combatfire_num_orcamento');
    if(salvo){
      document.getElementById('num-orcamento').value = salvo;
    }
  } catch(e){}
}


// ===== GOOGLE SHEETS INTEGRATION =====
const CHAVE_SHEETS_URL = 'combatfire_sheets_url';

function getSheetsUrl(){
  return localStorage.getItem(CHAVE_SHEETS_URL) || '';
}

function salvarUrlSheets(){
  const url = document.getElementById('sheets-url-input').value.trim();
  if(!url || !url.startsWith('https://script.google.com/')){
    showToast('❌ URL inválida. Deve começar com https://script.google.com/', 'erro');
    return;
  }
  localStorage.setItem(CHAVE_SHEETS_URL, url);
  showToast('✅ URL salva com sucesso!', 'ok');
  fecharModal('modal-sheets-config');
}

async function testarConexaoSheets(){
  const url = document.getElementById('sheets-url-input').value.trim();
  if(!url){ showToast('⚠️ Cole a URL primeiro.', 'erro'); return; }
  showToast('⏳ Testando conexão...', 'info');
  try{
    const res = await fetch(url, {
      method:'POST',
      body: JSON.stringify({action:'ping'}),
      headers:{'Content-Type':'text/plain'}
    });
    const d = await res.json();
    if(d.ok) showToast('✅ Conexão OK! ' + (d.msg||''), 'ok');
    else showToast('❌ Resposta inesperada: ' + JSON.stringify(d), 'erro');
  }catch(e){
    showToast('❌ Falha na conexão. Verifique a URL e as permissões do Apps Script.', 'erro');
  }
}

// ===== RASCUNHO AUTOMÁTICO (mantém o orçamento em digitação se a página recarregar) =====
function salvarRascunho(){
  try{
    const dados = coletarDadosOrcamento();
    localStorage.setItem(CHAVE_RASCUNHO, dados.json);
  }catch(e){}
}

function carregarRascunho(){
  try{
    const salvo = localStorage.getItem(CHAVE_RASCUNHO);
    return salvo ? JSON.parse(salvo) : null;
  }catch(e){
    return null;
  }
}

function limparRascunho(){
  try{ localStorage.removeItem(CHAVE_RASCUNHO); }catch(e){}
}

let _timerRascunho = null;
function agendarSalvarRascunho(){
  orcamentoTemAlteracoesNaoSalvas = true;
  clearTimeout(_timerRascunho);
  _timerRascunho = setTimeout(salvarRascunho, 600);
}

function coletarDadosOrcamento(){
  // Número
  const numero = document.getElementById('num-orcamento').value.trim();
  const cliente = document.getElementById('cli-empresa').value.trim();
  const cnpj = document.getElementById('cli-cnpj').value.trim();
  const data = document.getElementById('data-orcamento').value;
  const total = document.getElementById('total-geral').value;

  // Itens
  const itens = [];
  document.querySelectorAll('#corpo-tabela tr').forEach(tr => {
    const sel = tr.querySelector('select.select-produto');
    const textarea = tr.querySelector('textarea.descricao-manual');
    const span = tr.querySelector('.texto-selecionado');
    let descricao = '';
    if(sel && sel.value === OPCAO_MANUAL){
      descricao = textarea ? textarea.value : '';
    } else if(sel && sel.value !== ''){
      descricao = span ? span.textContent : '';
    }
    const qtd = tr.querySelector('.qtd') ? tr.querySelector('.qtd').value : '0';
    const valor = tr.querySelector('.valor-unit') ? tr.querySelector('.valor-unit').value : '0,00';
    if(descricao || parseFloat(qtd) > 0){
      itens.push({ descricao, qtd, valor });
    }
  });

  // Outros campos
  const obs = [];
  document.querySelectorAll('.obs-col textarea').forEach((t, i) => obs.push(t.value));
  const forma = document.querySelector('.meta-item:last-child input') ? document.querySelector('.meta-item:last-child input').value : '';
  const validade = document.querySelectorAll('.meta-item')[1] ? document.querySelectorAll('.meta-item')[1].querySelector('input').value : '';
  const desconto = document.getElementById('desconto').value;
  const tipoDesconto = document.getElementById('tipo-desconto') ? document.getElementById('tipo-desconto').value : 'valor';
  const cliEndereco = document.getElementById('cli-endereco').value;
  const cliCidade = document.getElementById('cli-cidade').value;
  const cliTel = document.getElementById('cli-telefone').value;
  const cliContato = document.getElementById('cli-contato').value;
  const cliCep = document.getElementById('cli-cep') ? document.getElementById('cli-cep').value : '';

  return {
    numero, cliente, cnpj, data, total,
    json: JSON.stringify({
      numero, cliente, cnpj, data, total,
      itens, obs, forma, validade, desconto, tipoDesconto,
      cliEndereco, cliCidade, cliTel, cliContato, cliCep
    })
  };
}

async function salvarNoSheets(){
  const url = getSheetsUrl();
  if(!url){
    showToast('⚠️ Configure a URL do Google Sheets primeiro (botão ⚙️).', 'info');
    abrirModalSheets();
    return false;
  }
  const dados = coletarDadosOrcamento();

  // Validação: nome do cliente obrigatório
  const nomeCliente = document.getElementById('cli-empresa').value.trim();
  if(!nomeCliente){
    showToast('❌ Informe o nome do cliente antes de salvar.', 'erro');
    document.getElementById('cli-empresa').focus();
    return false;
  }

  // Validação: pelo menos um item preenchido
  const linhas = document.querySelectorAll('#corpo-tabela tr');
  let temItem = false;
  linhas.forEach(tr => {
    const desc = tr.querySelector('.select-produto')?.value || tr.querySelector('.descricao-manual')?.value?.trim() || '';
    const qtd = parseFloat((tr.querySelector('.qtd')?.value || '0').replace(',','.')) || 0;
    const val = parseFloat((tr.querySelector('.valor-unit')?.value || '0').replace(/\./g,'').replace(',','.')) || 0;
    if(desc && (qtd > 0 || val > 0)) temItem = true;
  });
  if(!temItem){
    showToast('❌ Adicione pelo menos um item ao orçamento antes de salvar.', 'erro');
    return false;
  }

  if(!dados.numero){
    showToast('❌ Informe o número do orçamento antes de salvar.', 'erro');
    return false;
  }
  showToast('⏳ Salvando no Google Sheets...', 'info');
  try{
    const res = await fetch(url, {
      method:'POST',
      body: JSON.stringify({ action:'salvar', ...dados }),
      headers:{'Content-Type':'text/plain'}
    });
    const d = await res.json();
    if(d.ok){
      orcamentoTemAlteracoesNaoSalvas = false;
      showToast('✅ Orçamento Nº ' + dados.numero + ' salvo/atualizado no Sheets!', 'ok');
      return true;
    } else {
      showToast('❌ Erro: ' + (d.msg||'Falha desconhecida'), 'erro');
      return false;
    }
  }catch(e){
    showToast('❌ Erro de conexão. Verifique a URL do Apps Script.', 'erro');
    return false;
  }
}

async function abrirModalListaOrcamentos(){
  document.getElementById('modal-lista-orcamentos').classList.add('ativo');
  document.getElementById('lista-orcamentos-conteudo').innerHTML = '<div style="text-align:center;padding:24px;color:#999;">⏳ Carregando...</div>';

  const url = getSheetsUrl();
  if(!url){
    document.getElementById('lista-orcamentos-conteudo').innerHTML =
      '<div style="text-align:center;padding:24px;color:#b91c1c;">⚠️ URL do Google Sheets não configurada.<br><button onclick="fecharModal(\'modal-lista-orcamentos\');abrirModalSheets();" style="margin-top:10px;background:#1a73e8;color:#fff;border:none;border-radius:4px;padding:8px 16px;cursor:pointer;">Configurar agora</button></div>';
    return;
  }

  try{
    const res = await fetch(url, {
      method:'POST',
      body: JSON.stringify({action:'listar'}),
      headers:{'Content-Type':'text/plain'}
    });
    const d = await res.json();
    if(!d.ok) throw new Error(d.msg||'Erro');
    renderizarListaOrcamentos(d.lista || []);
  }catch(e){
    document.getElementById('lista-orcamentos-conteudo').innerHTML =
      '<div style="text-align:center;padding:24px;color:#b91c1c;">❌ Não foi possível carregar. Verifique a URL do Apps Script.</div>';
  }
}

// Mapa em memória para evitar corrupção de JSON via atributos HTML
let _mapaOrcamentos = {};

function renderizarListaOrcamentos(lista){
  const c = document.getElementById('lista-orcamentos-conteudo');
  if(!lista.length){
    c.innerHTML = '<div style="text-align:center;padding:24px;color:#999;">Nenhum orçamento salvo ainda.</div>';
    return;
  }
  // Guardar JSON bruto no mapa, indexado pelo número
  _mapaOrcamentos = {};
  lista.forEach(item => { _mapaOrcamentos[String(item.numero)] = item.json || '{}'; });

  // Ordenar por número decrescente
  lista.sort((a,b) => String(b.numero).localeCompare(String(a.numero), undefined, {numeric:true}));
  c.innerHTML = lista.map(item => `
    <div class="orcamento-item">
      <div class="orcamento-item-info">
        <div class="orcamento-item-num">Nº ${escapeHtml(String(item.numero))}</div>
        <div class="orcamento-item-cliente">
          ${escapeHtml(item.cliente||'(sem cliente)')} &nbsp;|&nbsp;
          ${escapeHtml(item.data||'')} &nbsp;|&nbsp;
          <strong>R$ ${escapeHtml(String(item.total||'0,00'))}</strong>
        </div>
        <div style="font-size:11px;color:#aaa;">Atualizado: ${escapeHtml(String(item.atualizado||''))}</div>
      </div>
      <div class="orcamento-item-acoes">
        <button class="btn-orcamento-carregar" onclick="carregarOrcamento('${escapeHtml(String(item.numero))}')">📂 Carregar</button>
        <button class="btn-orcamento-apagar" onclick="apagarOrcamento('${escapeHtml(String(item.numero))}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

function carregarOrcamento(numero){
  if(!confirm('Deseja carregar o orçamento Nº ' + numero + '?\nOs dados atuais serão substituídos.')) return;
  try{
    const jsonBruto = _mapaOrcamentos[String(numero)];
    if(!jsonBruto) throw new Error('Dados não encontrados');
    const dados = JSON.parse(jsonBruto);
    preencherFormulario(dados);
    fecharModal('modal-lista-orcamentos');
    showToast('✅ Orçamento Nº ' + numero + ' carregado!', 'ok');
  }catch(e){
    showToast('❌ Erro ao carregar orçamento: ' + e.message, 'erro');
  }
}

function preencherFormulario(dados){
  // Campos básicos
  if(dados.numero) document.getElementById('num-orcamento').value = dados.numero;
  if(dados.cliente) document.getElementById('cli-empresa').value = dados.cliente;
  if(dados.cnpj) document.getElementById('cli-cnpj').value = dados.cnpj;
  if(dados.data) document.getElementById('data-orcamento').value = dados.data;
  if(dados.cliEndereco) document.getElementById('cli-endereco').value = dados.cliEndereco;
  if(dados.cliCidade) document.getElementById('cli-cidade').value = dados.cliCidade;
  if(dados.cliTel) document.getElementById('cli-telefone').value = dados.cliTel;
  if(dados.cliContato) document.getElementById('cli-contato').value = dados.cliContato;
  if(dados.cliCep && document.getElementById('cli-cep')) document.getElementById('cli-cep').value = dados.cliCep;
  if(dados.validade){
    const metas = document.querySelectorAll('.meta-item');
    if(metas[1]) metas[1].querySelector('input').value = dados.validade;
  }
  if(dados.forma){
    const f = document.querySelector('.meta-item:last-child input');
    if(f) f.value = dados.forma;
  }
  if(dados.desconto) document.getElementById('desconto').value = dados.desconto;
  if(document.getElementById('tipo-desconto')) document.getElementById('tipo-desconto').value = dados.tipoDesconto || 'valor';

  // Observações
  if(dados.obs){
    const textareas = document.querySelectorAll('.obs-col textarea');
    dados.obs.forEach((txt, i) => { if(textareas[i]) textareas[i].value = txt; });
  }

  // Itens — limpa e recria
  const corpo = document.getElementById('corpo-tabela');
  corpo.innerHTML = '';
  contadorLinhas = 0;

  if(dados.itens && dados.itens.length){
    dados.itens.forEach(item => {
      const tr = criarLinha();
      // Define como manual
      const sel = tr.querySelector('select.select-produto');
      const textarea = tr.querySelector('textarea.descricao-manual');
      const span = tr.querySelector('.texto-selecionado');
      const trocarManual = tr.querySelector('.trocar-manual');
      const valorInput = tr.querySelector('.valor-unit');
      const qtdInput = tr.querySelector('.qtd');

      // Tenta encontrar no catálogo
      const catalogo = carregarCatalogo();
      const idx = catalogo.findIndex(p => p.nome === item.descricao);
      if(idx >= 0){
        sel.value = String(idx);
        span.textContent = catalogo[idx].nome;
        span.style.display = 'block';
        sel.style.display = 'none';
        valorInput.value = item.valor;
        valorInput.setAttribute('readonly','readonly');
        valorInput.style.background = '#fdf6e3';
      } else {
        sel.value = OPCAO_MANUAL;
        sel.style.display = 'none';
        textarea.style.display = 'block';
        textarea.value = item.descricao;
        span.textContent = item.descricao;
        valorInput.value = item.valor;
        valorInput.removeAttribute('readonly');
        valorInput.style.background = '';
        if(trocarManual) trocarManual.style.display = 'inline-block';
        textarea.oninput = function(){ autoResize(this); span.textContent = this.value; calcularLinha(this); };
      }
      qtdInput.value = item.qtd;
      corpo.appendChild(tr);
      calcularLinha(qtdInput);
    });
  } else {
    for(let i=0;i<3;i++) adicionarLinha();
  }
  calcularTotais();
  salvarRascunho();
  orcamentoTemAlteracoesNaoSalvas = false;
}

async function apagarOrcamento(numero){
  if(!confirm('Apagar orçamento Nº ' + numero + ' permanentemente?')) return;
  const url = getSheetsUrl();
  showToast('⏳ Apagando...', 'info');
  try{
    const res = await fetch(url,{
      method:'POST',
      body:JSON.stringify({action:'apagar',numero}),
      headers:{'Content-Type':'text/plain'}
    });
    const d = await res.json();
    if(d.ok){
      showToast('✅ Apagado!', 'ok');
      abrirModalListaOrcamentos();
    } else {
      showToast('❌ ' + (d.msg||'Erro'), 'erro');
    }
  }catch(e){
    showToast('❌ Erro de conexão.', 'erro');
  }
}

function abrirModalSheets(){
  const url = getSheetsUrl();
  document.getElementById('sheets-url-input').value = url;
  document.getElementById('modal-sheets-config').classList.add('ativo');
}

function fecharModal(id){
  document.getElementById(id).classList.remove('ativo');
}

function copiarAppsScript(){
  const code = document.getElementById('apps-script-code').value;
  navigator.clipboard.writeText(code).then(() => {
    showToast('✅ Código copiado! Cole no Apps Script.', 'ok');
  }).catch(() => {
    document.getElementById('apps-script-code').select();
    document.execCommand('copy');
    showToast('✅ Código copiado!', 'ok');
  });
}

function showToast(msg, tipo){
  const t = document.getElementById('toast-sheets');
  t.textContent = msg;
  t.className = tipo === 'ok' ? 'toast-ok' : tipo === 'erro' ? 'toast-erro' : 'toast-info';
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, tipo === 'erro' ? 6000 : 3500);
}

// Sobrescreve exportarPDF para fazer backup automático no Sheets
function removerPlaceholdersParaPDF(elemento){
  const campos = elemento.querySelectorAll('input[placeholder], textarea[placeholder]');
  campos.forEach(campo => {
    campo.dataset.placeholderOriginal = campo.placeholder;
    campo.placeholder = '';
  });
}

function restaurarPlaceholdersAposPDF(elemento){
  const campos = elemento.querySelectorAll('[data-placeholder-original]');
  campos.forEach(campo => {
    campo.placeholder = campo.dataset.placeholderOriginal;
    delete campo.dataset.placeholderOriginal;
  });
}

function exportarPDF(){
  const url = getSheetsUrl();
  const elemento = document.getElementById('folha');
  const opcoes = {
    margin: [8, 10, 8, 10],
    filename: 'Orcamento_CombatFire.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  prepararParaImpressao();
  removerPlaceholdersParaPDF(elemento);
  document.body.classList.add('gerando-pdf');
  html2pdf().set(opcoes).from(elemento).save().then(() => {
    document.body.classList.remove('gerando-pdf');
    restaurarAposImpressao();
    restaurarPlaceholdersAposPDF(elemento);
    // Backup automático no Sheets
    if(url){
      showToast('⏳ Fazendo backup no Google Sheets...', 'info');
      const dados = coletarDadosOrcamento();
      if(dados.numero){
        fetch(url,{
          method:'POST',
          body:JSON.stringify({action:'salvar',...dados}),
          headers:{'Content-Type':'text/plain'}
        }).then(r=>r.json()).then(d=>{
          if(d.ok) showToast('✅ PDF gerado + backup salvo no Sheets!', 'ok');
        }).catch(()=>{});
      }
    }
  }).catch(() => {
    document.body.classList.remove('gerando-pdf');
    restaurarAposImpressao();
    restaurarPlaceholdersAposPDF(elemento);
    showToast('❌ Erro ao gerar PDF', 'erro');
  });
}

window.addEventListener('DOMContentLoaded', function(){
  // Marca d'água no centro da folha (usa a mesma logo do cabeçalho)
  (function(){
    const logoEl = document.querySelector('.cabecalho img.logo');
    const marcaAguaEl = document.getElementById('folha-marca-agua');
    if(logoEl && marcaAguaEl && logoEl.src){
      marcaAguaEl.style.backgroundImage = `url("${logoEl.src}")`;
    }
  })();

  // Fechar modais ao clicar fora
  ['modal-sheets-config','modal-lista-orcamentos','modal-produtos','modal-configuracoes','modal-aviso-fechar'].forEach(id => {
    const overlay = document.getElementById(id);
    if(overlay) overlay.addEventListener('click', function(e){
      if(e.target === overlay) overlay.classList.remove('ativo');
    });
  });

  if(carregarCatalogo().length === 0 && localStorage.getItem(CHAVE_STORAGE) === null){
    salvarCatalogo([
      { nome: 'Extintor de Incêndio ABC 6kg', preco: 120.00 },
      { nome: 'Extintor de Incêndio CO2 6kg', preco: 180.00 },
      { nome: 'Mangueira de Incêndio 15m', preco: 350.00 },
      { nome: 'Manutenção de Extintor (recarga)', preco: 60.00 },
      { nome: 'Instalação de Sistema de Hidrantes', preco: 1500.00 },
      { nome: 'Visita Técnica / Vistoria', preco: 200.00 },
    ]);
  }
  // Se o sistema já estava aberto antes de atualizar a página, não mostra a splash de novo
  const splashEl = document.getElementById('splash');
  if(splashEl && localStorage.getItem('combatfire_splash_estado') === 'aberto'){
    splashEl.classList.add('hidden');
  }

  const rascunho = false; // sempre inicia novo
  if(rascunho){
    preencherFormulario(rascunho);
    carregarNumeroOrcamento();
    if(rascunho.numero) document.getElementById('num-orcamento').value = rascunho.numero;
    if(rascunho.data) document.getElementById('data-orcamento').value = rascunho.data;
    showToast('📝 Rascunho anterior restaurado', 'info');
  } else {
    for(let i = 0; i < 3; i++){ adicionarLinha(); }
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0];
    document.getElementById('data-orcamento').value = dataFormatada;
    carregarNumeroOrcamento();
    calcularTotais();
  }

  // Autosave: qualquer alteração no orçamento salva um rascunho local
  const folhaEl = document.getElementById('folha');
  folhaEl.addEventListener('input', agendarSalvarRascunho);
  folhaEl.addEventListener('change', agendarSalvarRascunho);
  orcamentoTemAlteracoesNaoSalvas = false;
});


// ===== SPLASH =====
function abrirSistema(){
  const splash = document.getElementById('splash');
  splash.classList.add('fadeout');
  setTimeout(() => splash.classList.add('hidden'), 550);
  localStorage.setItem('combatfire_splash_estado', 'aberto');
}

function fecharSistema(){
  if(orcamentoTemAlteracoesNaoSalvas){
    document.getElementById('modal-aviso-fechar').classList.add('ativo');
    return;
  }
  fecharSistemaConfirmado();
}

function fecharSistemaConfirmado(){
  const splash = document.getElementById('splash');
  splash.classList.remove('hidden');
  // pequeno delay pra remover fadeout após display voltar
  setTimeout(() => splash.classList.remove('fadeout'), 20);
  localStorage.setItem('combatfire_splash_estado', 'fechado');
}

// Fecha o popup de aviso e fecha o sistema mesmo sem salvar (descarta alterações)
function fecharSemSalvarOrcamento(){
  fecharModal('modal-aviso-fechar');
  fecharSistemaConfirmado();
}

// Tenta salvar no Sheets e, se conseguir, fecha o sistema (volta à tela inicial)
async function salvarEFecharSistema(){
  const sucesso = await salvarNoSheets();
  if(sucesso){
    fecharModal('modal-aviso-fechar');
    setTimeout(fecharSistemaConfirmado, 600);
  }
}

// ===== BACKUP E RESTAURAÇÃO =====
function fazerBackup(){
  try{
    const backup = {
      versao: '1.0',
      data: new Date().toISOString(),
      sheetsUrl: localStorage.getItem('combatfire_sheets_url') || '',
      catalogo: localStorage.getItem(CHAVE_STORAGE) || '[]',
      rascunho: localStorage.getItem(CHAVE_RASCUNHO) || '',
      numOrcamento: localStorage.getItem('combatfire_num_orcamento') || ''
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
    a.href = url;
    a.download = 'backup_combatfire_' + dataHoje + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Backup salvo com sucesso!', 'ok');
  } catch(e){
    showToast('❌ Erro ao gerar backup: ' + e.message, 'erro');
  }
}

function restaurarBackup(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e){
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(ev){
      try{
        const backup = JSON.parse(ev.target.result);
        if(!backup.versao || !backup.catalogo){
          showToast('❌ Arquivo inválido ou corrompido.', 'erro');
          return;
        }
        if(!confirm('Isso vai substituir todos os dados locais (catálogo, rascunho e URL do Sheets) pelo backup. Continuar?')) return;

        if(backup.sheetsUrl)    localStorage.setItem('combatfire_sheets_url', backup.sheetsUrl);
        if(backup.catalogo)     localStorage.setItem(CHAVE_STORAGE, backup.catalogo);
        if(backup.rascunho)     localStorage.setItem(CHAVE_RASCUNHO, backup.rascunho);
        if(backup.numOrcamento) localStorage.setItem('combatfire_num_orcamento', backup.numOrcamento);

        showToast('✅ Backup restaurado! Recarregando...', 'ok');
        setTimeout(() => location.reload(), 1800);
      } catch(err){
        showToast('❌ Erro ao ler backup: ' + err.message, 'erro');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
