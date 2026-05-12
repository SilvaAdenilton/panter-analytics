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
        background: '#f3f4f6',
        minHeight: '100vh',
        fontFamily: 'Arial',
      }}
    >
      <h1>Dashboard Panter</h1>

      <div
        style={{
          background: 'white',
          padding: 20,
          borderRadius: 12,
          marginTop: 20,
        }}
      >
        <h2>Banca Inicial</h2>

        <input
          type="number"
          value={bancaInicial}
          onChange={(e) =>
            setBancaInicial(Number(e.target.value))
          }
          style={{
            padding: 10,
            width: 200,
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,1fr)',
          gap: 15,
          marginTop: 20,
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
          background: 'white',
          padding: 20,
          borderRadius: 12,
          marginTop: 20,
        }}
      >
        <h2>Nova Entrada</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 10,
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
          />

          <select
            value={form.resultado}
            onChange={(e) =>
              setForm({
                ...form,
                resultado: e.target.value,
              })
            }
          >
            <option value="green">Green</option>
            <option value="red">Red</option>
          </select>
        </div>

        <button
          onClick={adicionarEntrada}
          style={{
            marginTop: 20,
            padding: 12,
            border: 'none',
            background: '#111827',
            color: 'white',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Adicionar Entrada
        </button>
      </div>

      <div
        style={{
          background: 'white',
          padding: 20,
          borderRadius: 12,
          marginTop: 20,
        }}
      >
        <h2>Histórico</h2>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr>
              <th>Data</th>
              <th>Jogo</th>
              <th>Mercado</th>
              <th>Odd</th>
              <th>Stake</th>
              <th>Resultado</th>
              <th>Lucro</th>
            </tr>
          </thead>

          <tbody>
            {entradas.map((e) => (
              <tr key={e.id}>
                <td>{e.data}</td>
                <td>{e.jogo}</td>
                <td>{e.mercado}</td>
                <td>{e.odd}</td>
                <td>R$ {e.stake}</td>
                <td>{e.resultado}</td>
                <td>R$ {e.lucro.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
        background: 'white',
        padding: 20,
        borderRadius: 12,
      }}
    >
      <p>{titulo}</p>

      <strong
        style={{
          fontSize: 24,
        }}
      >
        {valor}
      </strong>
    </div>
  );
}
