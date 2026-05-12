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
  lucro: number;
};

export default function Home() {
  const [bancaInicial, setBancaInicial] = useState(1000);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [colunasDetectadas, setColunasDetectadas] = useState<string[]>([]);

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

    if (texto.includes(',') && texto.includes('.')) {
      texto = texto.replace(/\./g, '').replace(',', '.');
    } else {
      texto = texto.replace(',', '.');
    }

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
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

  function calcularLucro(stake: number, odd: number, resultado: string, lucroPlanilha: number) {
    if (lucroPlanilha !== 0) return lucroPlanilha;

    const r = limparTexto(resultado);

    if (r.includes('green') || r.includes('ganha') || r.includes('win')) {
      return stake * odd - stake;
    }

    if (r.includes('red') || r.includes('perd') || r.includes('loss')) {
      return -stake;
    }

    if (
      r.includes('cashout') ||
      r.includes('anulada') ||
      r.includes('void') ||
      r.includes('devolvida')
    ) {
      return 0;
    }

    return 0;
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

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows: any[] = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
      });

      if (rows.length > 0) {
        setColunasDetectadas(Object.keys(rows[0]));
      }

      const dados: Entrada[] = rows.map((row, index) => {
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
          'Unidade',
          'Unidades',
          'Montante',
          'Custo',
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

        const lucroOriginal = pegarCampo(row, [
          'Lucro',
          'Retorno líquido',
          'Retorno liquido',
          'Profit',
          'P/L',
          'PL',
          'Resultado financeiro',
        ]);

        const odd = converterNumero(oddOriginal);
        const stake = converterNumero(stakeOriginal);
        const resultado = String(resultadoOriginal || '').toLowerCase();
        const lucroPlanilha = converterNumero(lucroOriginal);

        return {
          id: Date.now() + index,
          data: converterData(dataOriginal),
          jogo: String(jogo || ''),
          mercado: String(mercado || ''),
          odd,
          stake,
          resultado: resultado || 'não informado',
          lucro: calcularLucro(stake, odd, resultado, lucroPlanilha),
        };
      });

      setEntradas(dados);
    };

    reader.readAsArrayBuffer(file);
  }

  const resumo = useMemo(() => {
    const totalStake = entradas.reduce((acc, e) => acc + e.stake, 0);
    const lucroTotal = entradas.reduce((acc, e) => acc + e.lucro, 0);

    const greens = entradas.filter((e) =>
      limparTexto(e.resultado).includes('green')
    ).length;

    const reds = entradas.filter((e) =>
      limparTexto(e.resultado).includes('red')
    ).length;

    const bancaAtual = bancaInicial + lucroTotal;
    const roi = totalStake > 0 ? (lucroTotal / totalStake) * 100 : 0;
    const taxaGreen = entradas.length > 0 ? (greens / entradas.length) * 100 : 0;

    return {
      totalStake,
      lucroTotal,
      greens,
      reds,
      bancaAtual,
      roi,
      taxaGreen,
    };
  }, [entradas, bancaInicial]);

  const graficoBanca = useMemo(() => {
    let banca = bancaInicial;

    return entradas.map((e, index) => {
      banca += e.lucro;

      return {
        entrada: `#${index + 1}`,
        banca,
        lucro: e.lucro,
      };
    });
  }, [entradas, bancaInicial]);

  const pizzaResultados = [
    { name: 'Green', value: resumo.greens },
    { name: 'Red', value: resumo.reds },
    {
      name: 'Outros',
      value: Math.max(entradas.length - resumo.greens - resumo.reds, 0),
    },
  ];

  return (
    <main style={pageStyle}>
      <h1 style={titulo}>Dashboard Panter</h1>

      <p style={subtitulo}>
        Controle operacional de banca esportiva com Excel, gráficos e leitura automática de colunas.
      </p>

      <section style={card}>
        <h2>Importar Excel</h2>

        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={importarExcel}
          style={input}
        />

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
        <ResumoCard titulo="Stake Total" valor={moeda(resumo.totalStake)} />
        <ResumoCard titulo="ROI" valor={`${resumo.roi.toFixed(2)}%`} />
        <ResumoCard titulo="Taxa Green" valor={`${resumo.taxaGreen.toFixed(2)}%`} />
        <ResumoCard titulo="Entradas" valor={String(entradas.length)} />
      </section>

      <section style={card}>
        <h2>Evolução da Banca</h2>

        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={graficoBanca}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="entrada" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="banca" stroke="#22c55e" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section style={card}>
        <h2>Lucro por Entrada</h2>

        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={graficoBanca}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="entrada" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="lucro" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section style={card}>
        <h2>Distribuição</h2>

        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie data={pizzaResultados} dataKey="value" nameKey="name" outerRadius={100} label>
              <Cell fill="#22c55e" />
              <Cell fill="#ef4444" />
              <Cell fill="#facc15" />
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </section>

      <section style={card}>
        <h2>Tabela Operacional</h2>

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
                <th style={th}>Lucro</th>
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
                  <td style={td}>{e.resultado}</td>
                  <td
                    style={{
                      ...td,
                      color: e.lucro >= 0 ? '#22c55e' : '#ef4444',
                      fontWeight: 'bold',
                    }}
                  >
                    {moeda(e.lucro)}
                  </td>
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
};

const td = {
  padding: 14,
  borderBottom: '1px solid #374151',
};
