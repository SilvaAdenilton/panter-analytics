'use client';

import { useMemo, useState } from 'react';

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

  const [form, setForm] = useState({
    data: '',
    jogo: '',
    mercado: '',
    odd: '',
    stake: '',
    resultado: 'green',
  });

  function adicionarEntrada() {
    if (
      !form.data ||
      !form.jogo ||
      !form.mercado ||
      !form.odd ||
      !form.stake
    ) {
      alert('Preencha todos os campos');
      return;
    }

    const odd = Number(form.odd);
    const stake = Number(form.stake);

    let lucro = 0;

    if (form.resultado === 'green') {
      lucro = stake * odd - stake;
    }

    if (form.resultado === 'red') {
      lucro = -stake;
    }

    const novaEntrada: Entrada = {
      id: Date.now(),
      data: form.data,
      jogo: form.jogo,
      mercado: form.mercado,
      odd,
      stake,
      resultado: form.resultado,
      lucro,
    };

    setEntradas([...entradas, novaEntrada]);

    setForm({
      data: '',
      jogo: '',
      mercado: '',
      odd: '',
      stake: '',
      resultado: 'green',
    });
  }

  const resumo = useMemo(() => {
    const lucroTotal = entradas.reduce(
      (acc, item) => acc + item.lucro,
      0
    );

    const greens = entradas.filter(
      (e) => e.resultado === 'green'
    ).length;

    const reds = entradas.filter(
      (e) => e.resultado === 'red'
    ).length;

    const bancaAtual = bancaInicial + lucroTotal;

    return {
      lucroTotal,
      greens,
      reds,
      bancaAtual,
    };
  }, [entradas, bancaInicial]);

  return (
    <main
      style={{
        padding: 30,
        background: '#111827',
        color: 'white',
        minHeight: '100vh',
        fontFamily: 'Arial',
      }}
    >
      <h1
        style={{
          marginBottom: 10,
        }}
      >
        Dashboard Panter
      </h1>

      <p
        style={{
          color: '#9ca3af',
          marginBottom: 30,
        }}
      >
        Gestão operacional de banca esportiva.
      </p>

      <div
        style={{
          background: '#1f2937',
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <h2>Banca Inicial</h2>

        <input
          type="number"
          value={bancaInicial}
          onChange={(e) =>
            setBancaInicial(Number(e.target.value))
          }
          style={inputStyle}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit,minmax(220px,1fr))',
          gap: 15,
          marginBottom: 20,
        }}
      >
        <Card
          titulo="Banca Atual"
          valor={`R$ ${resumo.bancaAtual.toFixed(2)}`}
        />

        <Card
          titulo="Lucro"
          valor={`R$ ${resumo.lucroTotal.toFixed(2)}`}
        />

        <Card
          titulo="Greens"
          valor={String(resumo.greens)}
        />

        <Card
          titulo="Reds"
          valor={String(resumo.reds)}
        />
      </div>

      <div
        style={{
          background: '#1f2937',
          padding: 20,
          borderRadius: 12,
          marginBottom: 20,
        }}
      >
        <h2>Nova Entrada</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit,minmax(220px,1fr))',
            gap: 12,
          }}
        >
          <input
            type="date"
            value={form.data}
            onChange={(e) =>
              setForm({
                ...form,
                data: e.target.value,
              })
            }
            style={inputStyle}
          />

          <input
            placeholder="Jogo"
            value={form.jogo}
            onChange={(e) =>
              setForm({
                ...form,
                jogo: e.target.value,
              })
            }
            style={inputStyle}
          />

          <input
            placeholder="Mercado"
            value={form.mercado}
            onChange={(e) =>
              setForm({
                ...form,
                mercado: e.target.value,
              })
            }
            style={inputStyle}
          />

          <input
            type="number"
            placeholder="Odd"
            value={form.odd}
            onChange={(e) =>
              setForm({
                ...form,
                odd: e.target.value,
              })
            }
            style={inputStyle}
          />

          <input
            type="number"
            placeholder="Stake"
            value={form.stake}
            onChange={(e) =>
              setForm({
                ...form,
                stake: e.target.value,
              })
            }
            style={inputStyle}
          />

          <select
            value={form.resultado}
            onChange={(e) =>
              setForm({
                ...form,
                resultado: e.target.value,
              })
            }
            style={inputStyle}
          >
            <option value="green">Green</option>
            <option value="red">Red</option>
          </select>
        </div>

        <button
          onClick={adicionarEntrada}
          style={{
            marginTop: 20,
            background: '#2563eb',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: 10,
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Adicionar Entrada
        </button>
      </div>

      <div
        style={{
          background: '#1f2937',
          padding: 20,
          borderRadius: 12,
        }}
      >
        <h2>Histórico</h2>

        <div
          style={{
            overflowX: 'auto',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              marginTop: 20,
            }}
          >
            <thead>
              <tr
                style={{
                  background: '#374151',
                }}
              >
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Jogo</th>
                <th style={thStyle}>Mercado</th>
                <th style={thStyle}>Odd</th>
                <th style={thStyle}>Stake</th>
                <th style={thStyle}>Resultado</th>
                <th style={thStyle}>Lucro</th>
              </tr>
            </thead>

            <tbody>
              {entradas.map((e) => (
                <tr
                  key={e.id}
                  style={{
                    borderBottom:
                      '1px solid #374151',
                  }}
                >
                  <td style={tdStyle}>{e.data}</td>

                  <td style={tdStyle}>{e.jogo}</td>

                  <td style={tdStyle}>
                    {e.mercado}
                  </td>

                  <td style={tdStyle}>{e.odd}</td>

                  <td style={tdStyle}>
                    R$ {e.stake}
                  </td>

                  <td style={tdStyle}>
                    {e.resultado}
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      color:
                        e.lucro >= 0
                          ? '#22c55e'
                          : '#ef4444',
                      fontWeight: 'bold',
                    }}
                  >
                    R$ {e.lucro.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {entradas.length === 0 && (
          <p
            style={{
              marginTop: 20,
              color: '#9ca3af',
            }}
          >
            Nenhuma entrada cadastrada.
          </p>
        )}
      </div>
    </main>
  );
}

function Card({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div
      style={{
        background: '#1f2937',
        padding: 20,
        borderRadius: 12,
      }}
    >
      <p
        style={{
          color: '#9ca3af',
          marginBottom: 10,
        }}
      >
        {titulo}
      </p>

      <strong
        style={{
          fontSize: 28,
        }}
      >
        {valor}
      </strong>
    </div>
  );
}

const inputStyle = {
  background: '#374151',
  border: '1px solid #4b5563',
  padding: 12,
  borderRadius: 10,
  color: 'white',
  width: '100%',
};

const thStyle = {
  padding: 14,
  textAlign: 'left' as const,
};

const tdStyle = {
  padding: 14,
};
