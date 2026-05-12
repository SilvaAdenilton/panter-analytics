'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

type Status = 'Aberta' | 'Green' | 'Red' | 'Void' | 'Cashout';

type Bet = {
  id: number;
  data: string;
  jogo: string;
  mercado: string;
  odd: number;
  stake: number;
  status: Status;
  retorno?: number;
  casa: string;
  obs?: string;
};

const bancaInicialPadrao = 100;

function dinheiro(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizarTexto(valor: unknown) {
  return String(valor ?? '').trim();
}

function numero(valor: unknown) {
  if (typeof valor === 'number') return valor;
  const txt = String(valor ?? '').replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  const n = Number(txt);
  return Number.isFinite(n) ? n : 0;
}

function dataExcel(valor: unknown) {
  if (typeof valor === 'number') {
    const date = XLSX.SSF.parse_date_code(valor);
    if (!date) return '';
    return `${String(date.d).padStart(2, '0')}/${String(date.m).padStart(2, '0')}/${date.y}`;
  }
  return normalizarTexto(valor);
}

function statusPlanilha(valor: unknown): Status {
  const txt = normalizarTexto(valor).toLowerCase();
  if (txt.includes('green')) return 'Green';
  if (txt.includes('red')) return 'Red';
  if (txt.includes('void') || txt.includes('anulada') || txt.includes('devolvida')) return 'Void';
  if (txt.includes('cash')) return 'Cashout';
  return 'Aberta';
}

function lucroAposta(aposta: Bet) {
  if (aposta.status === 'Green') return aposta.stake * aposta.odd - aposta.stake;
  if (aposta.status === 'Red') return -aposta.stake;
  if (aposta.status === 'Void') return 0;
  if (aposta.status === 'Cashout') return (aposta.retorno ?? 0) - aposta.stake;
  return 0;
}

function Card({ titulo, valor, detalhe, cor = 'text-white' }: { titulo: string; valor: string; detalhe?: string; cor?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
      <p className="text-sm text-slate-400">{titulo}</p>
      <h2 className={`mt-2 text-3xl font-black ${cor}`}>{valor}</h2>
      {detalhe && <p className="mt-2 text-xs text-slate-500">{detalhe}</p>}
    </div>
  );
}

function Barra({ label, valor, maximo }: { label: string; valor: number; maximo: number }) {
  const largura = maximo === 0 ? 0 : Math.abs(valor / maximo) * 100;
  const cor = valor >= 0 ? 'bg-emerald-400' : 'bg-red-400';
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span className={valor >= 0 ? 'text-emerald-400' : 'text-red-400'}>{dinheiro(valor)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${Math.min(largura, 100)}%` }} />
      </div>
    </div>
  );
}

export default function Home() {
  const [bancaInicial, setBancaInicial] = useState(bancaInicialPadrao);
  const [apostas, setApostas] = useState<Bet[]>([]);
  const [filtro, setFiltro] = useState<Status | 'Todos'>('Todos');
  const [mensagem, setMensagem] = useState('Importe sua planilha ou cadastre entradas manualmente.');
  const [form, setForm] = useState({ data: '', jogo: '', mercado: '', odd: '', stake: '', casa: 'Bet365' });

  useEffect(() => {
    const salvo = localStorage.getItem('panter-apostas');
    const banca = localStorage.getItem('panter-banca-inicial');
    if (salvo) setApostas(JSON.parse(salvo));
    if (banca) setBancaInicial(Number(banca));
  }, []);

  useEffect(() => {
    localStorage.setItem('panter-apostas', JSON.stringify(apostas));
    localStorage.setItem('panter-banca-inicial', String(bancaInicial));
  }, [apostas, bancaInicial]);

  const dados = useMemo(() => {
    const liquidadas = apostas.filter((a) => a.status !== 'Aberta');
    const abertas = apostas.filter((a) => a.status === 'Aberta');
    const greens = liquidadas.filter((a) => a.status === 'Green').length;
    const reds = liquidadas.filter((a) => a.status === 'Red').length;
    const lucroLiquido = apostas.reduce((soma, a) => soma + lucroAposta(a), 0);
    const stakeLiquidada = liquidadas.reduce((soma, a) => soma + a.stake, 0);
    const exposicaoAberta = abertas.reduce((soma, a) => soma + a.stake, 0);
    const retornoPotencialAberto = abertas.reduce((soma, a) => soma + (a.retorno ?? a.stake * a.odd), 0);
    const bancaAtual = bancaInicial + lucroLiquido;
    const roi = bancaInicial ? (lucroLiquido / bancaInicial) * 100 : 0;
    const yieldGeral = stakeLiquidada ? (lucroLiquido / stakeLiquidada) * 100 : 0;
    const taxaAcerto = liquidadas.length ? (greens / liquidadas.length) * 100 : 0;
    const exposicaoPercentual = bancaAtual ? (exposicaoAberta / bancaAtual) * 100 : 0;

    const porMercado = apostas.reduce<Record<string, number>>((acc, a) => {
      const m = a.mercado.toLowerCase();
      const chave = m.includes('escanteio') ? 'Escanteios' : m.includes('under') || m.includes('menos') ? 'Under' : m.includes('over') || m.includes('mais') ? 'Over' : m.includes('ambas') ? 'BTTS' : 'Outros';
      acc[chave] = (acc[chave] ?? 0) + lucroAposta(a);
      return acc;
    }, {});

    const porDia = apostas.reduce<Record<string, number>>((acc, a) => {
      acc[a.data] = (acc[a.data] ?? 0) + lucroAposta(a);
      return acc;
    }, {});

    return { liquidadas, abertas, greens, reds, lucroLiquido, stakeLiquidada, exposicaoAberta, retornoPotencialAberto, bancaAtual, roi, yieldGeral, taxaAcerto, exposicaoPercentual, porMercado, porDia };
  }, [apostas, bancaInicial]);

  function adicionarEntrada() {
    if (!form.data || !form.jogo || !form.mercado || !form.odd || !form.stake) return;
    const odd = numero(form.odd);
    const stake = numero(form.stake);
    const nova: Bet = { id: Date.now(), data: form.data, jogo: form.jogo, mercado: form.mercado, odd, stake, status: 'Aberta', retorno: stake * odd, casa: form.casa };
    setApostas([nova, ...apostas]);
    setForm({ data: '', jogo: '', mercado: '', odd: '', stake: '', casa: 'Bet365' });
  }

  function importarPlanilha(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames.includes('Registro de Apostas') ? 'Registro de Apostas' : workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

      const importadas = rows
        .map((r, index): Bet | null => {
          const jogo = normalizarTexto(r['Jogo']);
          const mercado = normalizarTexto(r['Mercado']);
          const odd = numero(r['Odd']);
          const stake = numero(r['Stake (R$)'] ?? r['Stake']);
          if (!jogo || !mercado || !odd || !stake) return null;
          const retorno = numero(r['Retorno (R$)'] ?? r['Retorno']) || stake * odd;
          return {
            id: Date.now() + index,
            data: dataExcel(r['Data']),
            jogo,
            mercado,
            odd,
            stake,
            status: statusPlanilha(r['Resultado']),
            retorno,
            casa: normalizarTexto(r['Casa']) || 'Planilha',
            obs: normalizarTexto(r['Obs.'] ?? r['Observações']),
          };
        })
        .filter(Boolean) as Bet[];

      setApostas(importadas);
      setMensagem(`${importadas.length} entradas importadas da aba ${sheetName}.`);
    };
    reader.readAsArrayBuffer(file);
  }

  function exportarBackup() {
    const ws = XLSX.utils.json_to_sheet(apostas.map((a) => ({
      Data: a.data,
      Jogo: a.jogo,
      Mercado: a.mercado,
      Odd: a.odd,
      'Stake (R$)': a.stake,
      Resultado: a.status,
      'Retorno (R$)': a.retorno ?? a.stake * a.odd,
      'Lucro/Prejuízo (R$)': lucroAposta(a),
      Casa: a.casa,
      'Obs.': a.obs ?? '',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registro de Apostas');
    XLSX.writeFile(wb, 'panter-analytics-backup.xlsx');
  }

  function atualizarStatus(id: number, status: Status) {
    setApostas(apostas.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  function excluirEntrada(id: number) {
    setApostas(apostas.filter((a) => a.id !== id));
  }

  function limparTudo() {
    if (confirm('Deseja apagar todas as entradas salvas?')) {
      setApostas([]);
      localStorage.removeItem('panter-apostas');
    }
  }

  const apostasFiltradas = filtro === 'Todos' ? apostas : apostas.filter((a) => a.status === filtro);
  const maxMercado = Math.max(1, ...Object.values(dados.porMercado).map((v) => Math.abs(v)));
  const maxDia = Math.max(1, ...Object.values(dados.porDia).map((v) => Math.abs(v)));

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <header className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-emerald-400">Modo Panter</p>
          <h1 className="text-4xl font-black tracking-tight">Panter Analytics</h1>
          <p className="mt-2 text-slate-400">Importe sua planilha, cadastre entradas e feche Green/Red direto na dashboard.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportarBackup} className="rounded-xl bg-sky-500/20 px-4 py-2 text-sm font-bold text-sky-300 hover:bg-sky-500/30">Exportar Excel</button>
          <button onClick={limparTudo} className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-500/30">Limpar base</button>
        </div>
      </header>

      <section className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
        <h2 className="mb-3 text-xl font-bold text-emerald-300">Importar planilha</h2>
        <p className="mb-4 text-sm text-slate-300">Use sua planilha com a aba Registro de Apostas e colunas: Data, Jogo, Mercado, Odd, Stake (R$), Resultado, Retorno (R$), Lucro/Prejuízo (R$), Obs.</p>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && importarPlanilha(e.target.files[0])} className="block w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm" />
        <p className="mt-3 text-sm text-emerald-300">{mensagem}</p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card titulo="Banca inicial" valor={dinheiro(bancaInicial)} detalhe="Editável abaixo" />
        <Card titulo="Banca atual" valor={dinheiro(dados.bancaAtual)} detalhe={`ROI ${dados.roi.toFixed(1)}%`} cor={dados.bancaAtual >= bancaInicial ? 'text-emerald-400' : 'text-red-400'} />
        <Card titulo="Lucro líquido" valor={dinheiro(dados.lucroLiquido)} detalhe={`Yield ${dados.yieldGeral.toFixed(1)}%`} cor={dados.lucroLiquido >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <Card titulo="Exposição aberta" valor={dinheiro(dados.exposicaoAberta)} detalhe={`${dados.exposicaoPercentual.toFixed(1)}% da banca`} cor={dados.exposicaoPercentual > 40 ? 'text-red-400' : 'text-yellow-400'} />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card titulo="Taxa de acerto" valor={`${dados.taxaAcerto.toFixed(1)}%`} detalhe={`${dados.greens} greens / ${dados.reds} reds`} cor="text-blue-400" />
        <Card titulo="Entradas abertas" valor={String(dados.abertas.length)} detalhe="Aguardando fechamento" />
        <Card titulo="Retorno potencial" valor={dinheiro(dados.retornoPotencialAberto)} detalhe="Se todas abertas baterem" cor="text-sky-400" />
        <Card titulo="Entradas liquidadas" valor={String(dados.liquidadas.length)} detalhe="Green, red, void ou cashout" />
      </section>

      <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-2xl font-bold">Nova entrada manual</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-7">
          <input value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} placeholder="Data ex: 11/05/2026" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none" />
          <input value={form.jogo} onChange={(e) => setForm({ ...form, jogo: e.target.value })} placeholder="Jogo" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none" />
          <input value={form.mercado} onChange={(e) => setForm({ ...form, mercado: e.target.value })} placeholder="Mercado" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none" />
          <input value={form.odd} onChange={(e) => setForm({ ...form, odd: e.target.value })} placeholder="Odd" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none" />
          <input value={form.stake} onChange={(e) => setForm({ ...form, stake: e.target.value })} placeholder="Stake" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none" />
          <input value={form.casa} onChange={(e) => setForm({ ...form, casa: e.target.value })} placeholder="Casa" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none" />
          <button onClick={adicionarEntrada} className="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-emerald-400">Adicionar</button>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <label className="text-sm text-slate-400">Banca inicial:</label>
          <input value={bancaInicial} onChange={(e) => setBancaInicial(Number(e.target.value))} type="number" className="w-40 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm outline-none" />
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-2xl font-bold">Lucro por mercado</h2>
          <div className="space-y-4">
            {Object.entries(dados.porMercado).map(([mercado, lucro]) => <Barra key={mercado} label={mercado} valor={lucro} maximo={maxMercado} />)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-4 text-2xl font-bold">Fechamento por dia</h2>
          <div className="space-y-4">
            {Object.entries(dados.porDia).map(([dia, lucro]) => <Barra key={dia} label={dia} valor={lucro} maximo={maxDia} />)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <h2 className="text-2xl font-bold">Registro de entradas</h2>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as Status | 'Todos')} className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm">
            <option>Todos</option><option>Aberta</option><option>Green</option><option>Red</option><option>Void</option><option>Cashout</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700 text-slate-400">
              <tr><th className="py-3 text-left">Data</th><th className="py-3 text-left">Jogo</th><th className="py-3 text-left">Mercado</th><th className="py-3 text-left">Odd</th><th className="py-3 text-left">Stake</th><th className="py-3 text-left">Retorno</th><th className="py-3 text-left">Status</th><th className="py-3 text-left">Lucro</th><th className="py-3 text-left">Ações</th></tr>
            </thead>
            <tbody>
              {apostasFiltradas.map((a) => {
                const lucro = lucroAposta(a);
                return (
                  <tr key={a.id} className="border-b border-slate-800">
                    <td className="py-3 text-slate-400">{a.data}</td><td className="py-3 font-medium">{a.jogo}</td><td className="py-3">{a.mercado}</td><td className="py-3">{a.odd.toFixed(2)}</td><td className="py-3">{dinheiro(a.stake)}</td><td className="py-3 text-sky-400">{dinheiro(a.retorno ?? a.stake * a.odd)}</td>
                    <td className="py-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${a.status === 'Green' ? 'bg-emerald-500/20 text-emerald-300' : a.status === 'Red' ? 'bg-red-500/20 text-red-300' : a.status === 'Aberta' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-slate-700 text-slate-300'}`}>{a.status}</span></td>
                    <td className={`py-3 font-bold ${lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{dinheiro(lucro)}</td>
                    <td className="flex flex-wrap gap-2 py-3"><button onClick={() => atualizarStatus(a.id, 'Green')} className="rounded-lg bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-300">Green</button><button onClick={() => atualizarStatus(a.id, 'Red')} className="rounded-lg bg-red-500/20 px-2 py-1 text-xs font-bold text-red-300">Red</button><button onClick={() => atualizarStatus(a.id, 'Void')} className="rounded-lg bg-slate-700 px-2 py-1 text-xs font-bold text-slate-300">Void</button><button onClick={() => atualizarStatus(a.id, 'Aberta')} className="rounded-lg bg-yellow-500/20 px-2 py-1 text-xs font-bold text-yellow-300">Aberta</button><button onClick={() => excluirEntrada(a.id)} className="rounded-lg bg-red-900/40 px-2 py-1 text-xs font-bold text-red-200">Excluir</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
