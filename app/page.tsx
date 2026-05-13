'use client';

import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type Entrada = {
  id: number;
  data: string;
  jogo: string;
  mercado: string;
  odd: number;
  stake: number;
  resultado: string;
  retorno: number;
  lucro: number;
  obs: string;
};

export default function Home() {
  const [bancaInicial, setBancaInicial] = useState(1000);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [colunasDetectadas, setColunasDetectadas] = useState<string[]>([]);
  const [guiaUsada, setGuiaUsada] = useState('');

  function moeda(valor: number) {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function limparTexto(valor: any) {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function pegarCampo(row: any, nomes: string[]) {
    const chaves = Object.keys(row);

    for (const nome of nomes) {
      const nomeLimpo = limparTexto(nome);

      const encontrado = chaves.find((chave) => {
        const chaveLimpa = limparTexto(chave);
        return chaveLimpa === nomeLimpo || chaveLimpa.includes(nomeLimpo);
      });

      if (encontrado) return row[encontrado];
    }

    return '';
  }

  function converterNumero(valor: any) {
    if (valor === null || valor === undefined || valor === '') return 0;
    if (typeof valor === 'number') return valor;

    let texto = String(valor)
      .replace('R$', '')
      .replace('%', '')
      .replace(/\s/g, '')
      .trim();

    const negativoContabil = texto.includes('(') && texto.includes(')');
    texto = texto.replace('(', '').replace(')', '');

    if (texto.includes(',') && texto.includes('.')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    } else {
      texto = texto.replace(',', '.');
    }

    const numero = Number(texto);
    if (!Number.isFinite(numero)) return 0;

    return negativoContabil ? -Math.abs(numero) : numero;
  }

  function converterData(valor: any) {
    if (!valor) return '';

    if (typeof valor === 'number') {
      const dataExcel = XLSX.SSF.parse_date_code(valor);

      if (dataExcel) {
        const dia = String(dataExcel.d).padStart(2, '0');
        const mes = String(dataExcel.m).padStart(2, '0');
        const ano = dataExcel.y;

        return `${dia}/${mes}/${ano}`;
      }
    }

    if (valor instanceof Date) {
      return valor.toLocaleDateString('pt-BR');
    }

    return String(valor);
  }

  function classificarResultado(resultado: string) {
    const r = limparTexto(resultado);

    if (r.includes('green') || r.includes('ganha') || r.includes('win')) return 'green';
    if (r.includes('red') || r.includes('perd') || r.includes('loss')) return 'red';
    if (r.includes('cashout')) return 'cashout';
    if (r.includes('void') || r.includes('anulada') || r.includes('devolvida')) return 'void';

    return 'outros';
  }

  function normalizarMercado(mercado: string) {
    const m = limparTexto(mercado);

    if (m.includes('escanteio') || m.includes('corner')) return 'Escanteios';
    if (m.includes('ambas') || m.includes('btts')) return 'Ambas Marcam';
    if (m.includes('under') || m.includes('menos')) return 'Under Gols';
    if (m.includes('over') || m.includes('mais')) return 'Over Gols';
    if (m.includes('dnb') || m.includes('empate anula')) return 'DNB';
    if (m.includes('handicap') || m.includes('hc')) return 'Handicap';
    if (m.includes('cartao') || m.includes('cartão')) return 'Cartões';
    if (m.includes('multipla') || m.includes('múltipla')) return 'Múltiplas';

    return mercado || 'Não informado';
  }

  function faixaOdd(odd: number) {
    if (odd <= 0) return 'Sem odd';
    if (odd < 1.4) return '1.01 - 1.39';
    if (odd < 1.6) return '1.40 - 1.59';
    if (odd < 1.8) return '1.60 - 1.79';
    if (odd < 2) return '1.80 - 1.99';
    return '2.00+';
  }

  function importarExcel(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);

      const workbook = XLSX.read(data, {
        type: 'array',
        cellDates: true,
      });

      const nomeGuiaRegistro =
        workbook.SheetNames.find((nome) => limparTexto(nome).includes('registro de apostas')) ||
        workbook.SheetNames.find((nome) => limparTexto(nome).includes('registros de apostas')) ||
        workbook.SheetNames.find((nome) => limparTexto(nome).includes('apostas')) ||
        workbook.SheetNames[0];

      setGuiaUsada(nomeGuiaRegistro);

      const sheet = workbook.Sheets[nomeGuiaRegistro];

      const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
      });

      if (rows.length > 0) {
        setColunasDetectadas(Object.keys(rows[0]));
      }

      const dados: Entrada[] = rows
        .map((row, index) => {
          const dataOriginal = pegarCampo(row, [
            'Data',
            'Dia',
            'Date',
            'Data da aposta',
            'Data aposta',
            'Dt',
          ]);

          const jogo = pegarCampo(row, [
            'Jogo',
            'Partida',
            'Evento',
            'Confronto',
            'Match',
          ]);

          const mercado = pegarCampo(row, [
            'Mercado',
            'Market',
            'Aposta',
            'Tipo',
            'Seleção',
            'Selecao',
          ]);

          const oddOriginal = pegarCampo(row, [
            'Odd',
            'Odds',
            'Cotação',
            'Cotacao',
            'Preço',
            'Preco',
          ]);

          const stakeOriginal = pegarCampo(row, [
            'Stake (R$)',
            'Stake',
            'Valor',
            'Valor apostado',
            'Valor da aposta',
            'Valor aplicado',
            'Aplicado',
            'Entrada',
            'Investimento',
            'Investido',
            'Apostado',
          ]);

          const resultadoOriginal = pegarCampo(row, [
            'Resultado',
            'Status',
            'Situação',
            'Situacao',
            'Resultado aposta',
            'Green Red',
            'Green/Red',
          ]);

          const retornoOriginal = pegarCampo(row, [
            'Retorno (R$)',
            'Retorno R$',
            'Retorno',
            'Retorno bruto',
            'Payout',
            'Ganhos',
          ]);

          const lucroOriginal = pegarCampo(row, [
            'Lucro/Prejuízo (R$)',
            'Lucro/Prejuizo (R$)',
            'Lucro Prejuízo',
            'Lucro Prejuizo',
            'Lucro prejuízo',
            'Lucro prejuizo',
            'Lucro',
            'P/L',
            'PL',
            'Resultado financeiro',
          ]);

          const obsOriginal = pegarCampo(row, [
            'Obs.',
            'Obs',
            'Observação',
            'Observacao',
            'Notas',
            'Comentário',
            'Comentario',
          ]);

          return {
            id: Date.now() + index,
            data: converterData(dataOriginal),
            jogo: String(jogo || ''),
            mercado: String(mercado || ''),
            odd: converterNumero(oddOriginal),
            stake: converterNumero(stakeOriginal),
            resultado: String(resultadoOriginal || 'não informado').toLowerCase(),
            retorno: converterNumero(retornoOriginal),
            lucro: converterNumero(lucroOriginal),
            obs: String(obsOriginal || ''),
          };
        })
        .filter((e) => e.data || e.jogo || e.mercado || e.stake || e.retorno || e.lucro);

      setEntradas(dados);
    };

    reader.readAsArrayBuffer(file);
  }

  const resumo = useMemo(() => {
    const totalStake = entradas.reduce((acc, e) => acc + e.stake, 0);
    const retornoTotal = entradas.reduce((acc, e) => acc + e.retorno, 0);
    const lucroTotal = entradas.reduce((acc, e) => acc + e.lucro, 0);

    const greens = entradas.filter((e) => classificarResultado(e.resultado) === 'green').length;
    const reds = entradas.filter((e) => classificarResultado(e.resultado) === 'red').length;
    const cashouts = entradas.filter((e) => classificarResultado(e.resultado) === 'cashout').length;
    const voids = entradas.filter((e) => classificarResultado(e.resultado) === 'void').length;
    const outros = Math.max(entradas.length - greens - reds - cashouts - voids, 0);

    const roi = totalStake > 0 ? (lucroTotal / totalStake) * 100 : 0;
    const taxaGreen = entradas.length > 0 ? (greens / entradas.length) * 100 : 0;
    const taxaRed = entradas.length > 0 ? (reds / entradas.length) * 100 : 0;

    let banca = bancaInicial;
    let pico = bancaInicial;
    let maiorDrawdown = 0;

    entradas.forEach((e) => {
      banca += e.lucro;

      if (banca > pico) pico = banca;

      const drawdown = pico - banca;

      if (drawdown > maiorDrawdown) maiorDrawdown = drawdown;
    });

    let maiorSequenciaRed = 0;
    let maiorSequenciaGreen = 0;
    let atualRed = 0;
    let atualGreen = 0;

    entradas.forEach((e) => {
      const r = classificarResultado(e.resultado);

      if (r === 'red') {
        atualRed++;
        atualGreen = 0;
      } else if (r === 'green') {
        atualGreen++;
        atualRed = 0;
      } else {
        atualRed = 0;
        atualGreen = 0;
      }

      maiorSequenciaRed = Math.max(maiorSequenciaRed, atualRed);
      maiorSequenciaGreen = Math.max(maiorSequenciaGreen, atualGreen);
    });

    return {
      bancaAtual: bancaInicial + lucroTotal,
      totalStake,
      retornoTotal,
      lucroTotal,
      greens,
      reds,
      cashouts,
      voids,
      outros,
      roi,
      taxaGreen,
      taxaRed,
      maiorDrawdown,
      maiorSequenciaRed,
      maiorSequenciaGreen,
      stakeMedia: entradas.length ? totalStake / entradas.length : 0,
      lucroMedio: entradas.length ? lucroTotal / entradas.length : 0,
      retornoMedio: entradas.length ? retornoTotal / entradas.length : 0,
    };
  }, [entradas, bancaInicial]);

  const graficoBanca = useMemo(() => {
    let banca = bancaInicial;

    return entradas.map((e, index) => {
      banca += e.lucro;

      return {
        entrada: `#${index + 1}`,
        data: e.data,
        jogo: e.jogo,
        banca,
        stake: e.stake,
        retorno: e.retorno,
        lucro: e.lucro,
      };
    });
  }, [entradas, bancaInicial]);

  function agruparPor(chave: 'mercado' | 'odd' | 'resultado') {
    const mapa: Record<string, any> = {};

    entradas.forEach((e) => {
      let key = '';

      if (chave === 'mercado') key = normalizarMercado(e.mercado);
      if (chave === 'odd') key = faixaOdd(e.odd);
      if (chave === 'resultado') key = classificarResultado(e.resultado);

      if (!mapa[key]) {
        mapa[key] = {
          nome: key,
          entradas: 0,
          stake: 0,
          retorno: 0,
          lucro: 0,
          greens: 0,
          reds: 0,
          cashouts: 0,
          voids: 0,
          roi: 0,
          taxaGreen: 0,
        };
      }

      mapa[key].entradas++;
      mapa[key].stake += e.stake;
      mapa[key].retorno += e.retorno;
      mapa[key].lucro += e.lucro;

      const resultado = classificarResultado(e.resultado);

      if (resultado === 'green') mapa[key].greens++;
      if (resultado === 'red') mapa[key].reds++;
      if (resultado === 'cashout') mapa[key].cashouts++;
      if (resultado === 'void') mapa[key].voids++;
    });

    return Object.values(mapa)
      .map((item: any) => ({
        ...item,
        roi: item.stake > 0 ? (item.lucro / item.stake) * 100 : 0,
        taxaGreen: item.entradas > 0 ? (item.greens / item.entradas) * 100 : 0,
      }))
      .sort((a: any, b: any) => b.lucro - a.lucro);
  }

  const porMercado = useMemo(() => agruparPor('mercado'), [entradas]);
  const porOdd = useMemo(() => agruparPor('odd'), [entradas]);
  const porResultado = useMemo(() => agruparPor('resultado'), [entradas]);

  const pizzaResultados = [
    { name: 'Green', value: resumo.greens },
    { name: 'Red', value: resumo.reds },
    { name: 'Cashout', value: resumo.cashouts },
    { name: 'Void', value: resumo.voids },
    { name: 'Outros', value: resumo.outros },
  ];

  const leituraPanter = useMemo(() => {
    const melhorMercado = porMercado[0];
    const melhorOdd = porOdd[0];

    if (!entradas.length) {
      return 'Importe sua planilha para gerar a leitura Panter.';
    }

    if (resumo.roi > 0) {
      return `Panter positivo: ROI em ${resumo.roi.toFixed(2)}%. Melhor mercado até agora: ${
        melhorMercado?.nome || '-'
      }. Melhor faixa de odd: ${melhorOdd?.nome || '-'}.`;
    }

    return `Panter em atenção: ROI em ${resumo.roi.toFixed(
      2
    )}%. Revise os mercados negativos, controle stake e evite repetir entradas correlacionadas.`;
  }, [entradas, resumo.roi, porMercado, porOdd]);

  return (
    <main style={pageStyle}>
      <h1 style={titulo}>Dashboard Panter Pro</h1>

      <p style={subtitulo}>
        Dashboard herdando os dados reais da guia Registro de Apostas.
      </p>

      <section style={card}>
        <h2>Importar Excel</h2>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={importarExcel}
          style={input}
        />

        {guiaUsada && (
          <p style={textoSecundario}>
            Guia utilizada: {guiaUsada}
          </p>
        )}

        {colunasDetectadas.length > 0 && (
          <p style={textoSecundario}>
            Colunas detectadas: {colunasDetectadas.join(' | ')}
          </p>
        )}
      </section>

      <section style={card}>
        <h2>Banca Inicial</h2>

        <input
          type="number"
          value={bancaInicial}
          onChange={(e) => setBancaInicial(Number(e.target.value))}
          style={input}
        />
      </section>

      <section style={grid}>
        <ResumoCard titulo="Banca Atual" valor={moeda(resumo.bancaAtual)} />
        <ResumoCard titulo="Lucro Total" valor={moeda(resumo.lucroTotal)} />
        <ResumoCard titulo="Retorno Total" valor={moeda(resumo.retornoTotal)} />
        <ResumoCard titulo="Stake Total" valor={moeda(resumo.totalStake)} />
        <ResumoCard titulo="ROI" valor={`${resumo.roi.toFixed(2)}%`} />
        <ResumoCard titulo="Taxa Green" valor={`${resumo.taxaGreen.toFixed(2)}%`} />
        <ResumoCard titulo="Taxa Red" valor={`${resumo.taxaRed.toFixed(2)}%`} />
        <ResumoCard titulo="Greens" valor={String(resumo.greens)} />
        <ResumoCard titulo="Reds" valor={String(resumo.reds)} />
        <ResumoCard titulo="Cashouts" valor={String(resumo.cashouts)} />
        <ResumoCard titulo="Voids" valor={String(resumo.voids)} />
        <ResumoCard titulo="Drawdown Máx." valor={moeda(resumo.maiorDrawdown)} />
        <ResumoCard titulo="Maior Seq. Green" valor={String(resumo.maiorSequenciaGreen)} />
        <ResumoCard titulo="Maior Seq. Red" valor={String(resumo.maiorSequenciaRed)} />
        <ResumoCard titulo="Stake Média" valor={moeda(resumo.stakeMedia)} />
        <ResumoCard titulo="Lucro Médio" valor={moeda(resumo.lucroMedio)} />
        <ResumoCard titulo="Retorno Médio" valor={moeda(resumo.retornoMedio)} />
        <ResumoCard titulo="Entradas" valor={String(entradas.length)} />
      </section>

      <section style={cardDestaque}>
        <h2>Leitura Panter</h2>
        <p style={{ fontSize: 18, lineHeight: 1.6 }}>{leituraPanter}</p>
      </section>

      <section style={card}>
        <h2>Evolução da Banca</h2>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={graficoBanca}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="entrada" />
            <YAxis />
            <Tooltip formatter={(value: any) => moeda(Number(value))} />
            <Line type="monotone" dataKey="banca" stroke="#22c55e" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section style={card}>
        <h2>Lucro/Prejuízo por Entrada</h2>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={graficoBanca}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="entrada" />
            <YAxis />
            <Tooltip formatter={(value: any) => moeda(Number(value))} />
            <Bar dataKey="lucro" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section style={card}>
        <h2>Retorno por Entrada</h2>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={graficoBanca}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="entrada" />
            <YAxis />
            <Tooltip formatter={(value: any) => moeda(Number(value))} />
            <Bar dataKey="retorno" fill="#14b8a6" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section style={card}>
        <h2>Lucro por Mercado</h2>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={porMercado}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nome" />
            <YAxis />
            <Tooltip formatter={(value: any) => moeda(Number(value))} />
            <Bar dataKey="lucro" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section style={card}>
        <h2>Lucro por Faixa de Odd</h2>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={porOdd}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="nome" />
            <YAxis />
            <Tooltip formatter={(value: any) => moeda(Number(value))} />
            <Bar dataKey="lucro" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section style={card}>
        <h2>Distribuição de Resultados</h2>

        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie data={pizzaResultados} dataKey="value" nameKey="name" outerRadius={100} label>
              <Cell fill="#22c55e" />
              <Cell fill="#ef4444" />
              <Cell fill="#3b82f6" />
              <Cell fill="#facc15" />
              <Cell fill="#9ca3af" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </section>

      <TabelaAnalitica titulo="Ranking por Mercado" dados={porMercado} moeda={moeda} />
      <TabelaAnalitica titulo="Ranking por Faixa de Odd" dados={porOdd} moeda={moeda} />
      <TabelaAnalitica titulo="Ranking por Resultado" dados={porResultado} moeda={moeda} />

      <section style={card}>
        <h2>Registro de Apostas</h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>Data</th>
                <th style={th}>Jogo</th>
                <th style={th}>Mercado</th>
                <th style={th}>Odd</th>
                <th style={th}>Stake</th>
                <th style={th}>Resultado</th>
                <th style={th}>Retorno</th>
                <th style={th}>Lucro/Prejuízo</th>
                <th style={th}>Obs.</th>
              </tr>
            </thead>

            <tbody>
              {entradas.map((e) => (
                <tr key={e.id}>
                  <td style={td}>{e.data}</td>
                  <td style={td}>{e.jogo}</td>
                  <td style={td}>{e.mercado}</td>
                  <td style={td}>{e.odd}</td>
                  <td style={td}>{moeda(e.stake)}</td>
                  <td
                    style={{
                      ...td,
                      color:
                        classificarResultado(e.resultado) === 'green'
                          ? '#22c55e'
                          : classificarResultado(e.resultado) === 'red'
                          ? '#ef4444'
                          : '#facc15',
                      fontWeight: 'bold',
                    }}
                  >
                    {e.resultado}
                  </td>
                  <td style={td}>{moeda(e.retorno)}</td>
                  <td
                    style={{
                      ...td,
                      color: e.lucro >= 0 ? '#22c55e' : '#ef4444',
                      fontWeight: 'bold',
                    }}
                  >
                    {moeda(e.lucro)}
                  </td>
                  <td style={td}>{e.obs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {entradas.length === 0 && (
          <p style={textoSecundario}>Nenhuma planilha importada.</p>
        )}
      </section>
    </main>
  );
}

function ResumoCard({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div style={card}>
      <p style={textoSecundario}>{titulo}</p>
      <strong style={{ fontSize: 28 }}>{valor}</strong>
    </div>
  );
}

function TabelaAnalitica({
  titulo,
  dados,
  moeda,
}: {
  titulo: string;
  dados: any[];
  moeda: (v: number) => string;
}) {
  return (
    <section style={card}>
      <h2>{titulo}</h2>

      <div style={{ overflowX: 'auto' }}>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Grupo</th>
              <th style={th}>Entradas</th>
              <th style={th}>Greens</th>
              <th style={th}>Reds</th>
              <th style={th}>Cashouts</th>
              <th style={th}>Voids</th>
              <th style={th}>Stake</th>
              <th style={th}>Retorno</th>
              <th style={th}>Lucro</th>
              <th style={th}>ROI</th>
              <th style={th}>Taxa Green</th>
            </tr>
          </thead>

          <tbody>
            {dados.map((item) => (
              <tr key={item.nome}>
                <td style={td}>{item.nome}</td>
                <td style={td}>{item.entradas}</td>
                <td style={td}>{item.greens}</td>
                <td style={td}>{item.reds}</td>
                <td style={td}>{item.cashouts}</td>
                <td style={td}>{item.voids}</td>
                <td style={td}>{moeda(item.stake)}</td>
                <td style={td}>{moeda(item.retorno)}</td>
                <td
                  style={{
                    ...td,
                    color: item.lucro >= 0 ? '#22c55e' : '#ef4444',
                    fontWeight: 'bold',
                  }}
                >
                  {moeda(item.lucro)}
                </td>
                <td
                  style={{
                    ...td,
                    color: item.roi >= 0 ? '#22c55e' : '#ef4444',
                    fontWeight: 'bold',
                  }}
                >
                  {item.roi.toFixed(2)}%
                </td>
                <td style={td}>{item.taxaGreen.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const pageStyle = {
  background: '#111827',
  color: 'white',
  minHeight: '100vh',
  padding: 30,
  fontFamily: 'Arial',
};

const titulo = {
  fontSize: 38,
  marginBottom: 10,
};

const subtitulo = {
  color: '#9ca3af',
  marginBottom: 30,
};

const card = {
  background: '#1f2937',
  padding: 20,
  borderRadius: 16,
  marginBottom: 20,
};

const cardDestaque = {
  background: '#064e3b',
  padding: 22,
  borderRadius: 16,
  marginBottom: 20,
  border: '1px solid #22c55e',
};

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
  gap: 15,
};

const input = {
  width: '100%',
  background: '#374151',
  color: 'white',
  border: '1px solid #4b5563',
  padding: 12,
  borderRadius: 10,
};

const textoSecundario = {
  color: '#9ca3af',
  marginTop: 12,
};

const table = {
  width: '100%',
  borderCollapse: 'collapse' as const,
};

const th = {
  background: '#374151',
  padding: 14,
  textAlign: 'left' as const,
  whiteSpace: 'nowrap' as const,
};

const td = {
  padding: 14,
  borderBottom: '1px solid #374151',
  whiteSpace: 'nowrap' as const,
};
