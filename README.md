# ReDuino — Sistema IoT de Sensor de Ré

Sistema de sensor de ré com Arduino Nano, nRF24L01 e HC-SR04, com dashboard web em Next.js.

---

## Arquitetura

[Sensor HC-SR04]               [Atuador Buzzer/LED]
      │                               │
[Arduino Sensor]  ── nRF24 ──  [Arduino Atuador]
      │
[Arduino Gateway] ── USB/Serial ── [Node.js Back]
                                         │
                                   [Next.js Front]
                                         │
                                    [Smartphone/Browser]

---

## Repositórios

| Repo | Conteúdo |
|------|----------|
| `ReDuino-Front` | Dashboard Next.js
| `ReDuino-Back`  | Servidor Node.js (este)
| `ReDuino-IoT`   | Sketches Arduino

---

## ReDuino-Back (Node.js)

### Pré-requisitos

- Node.js >= 18
- Arduino Nano (gateway) conectado via USB

### Instalação

```bash
npm install
cp .env.example .env
# edite o .env com suas configurações
```

### Configuração (.env)

| Variável | Descrição | Padrão |
| `DATABASE_URL` | URL PostgreSQL Neon | — |
| `SERIAL_PORT` | Porta serial do gateway | `/dev/ttyUSB0` |
| `PORT` | Porta HTTP | `3001` |
| `FRONTEND_URL` | URL do front (CORS) | `http://localhost:3000` |
| `SENSOR_NODE_ID` | ID do nó sensor | `47` |

### Rodar

```bash
npm start        # produção
npm run dev      # desenvolvimento (nodemon)
```

### Endpoints

| Método | Rota | Descrição |
| `GET` | `/api/status` | Estado atual do sistema |
| `POST` | `/api/toggle` | Liga/desliga sensor |
| `GET` | `/api/messages` | Histórico de leituras |
| `GET` | `/api/health` | Healthcheck |

#### GET /api/status — resposta
json
{
  "active": true,
  "distance": 85,
  "alert": "warn",
  "statusText": "ATENÇÃO",
  "beepsPerSec": "3",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}

#### POST /api/toggle — body (opcional)
json
{ "active": true }
Se o body for omitido, faz toggle do estado atual.

---

## ReDuino-IoT (Arduino)

### Sketches

| Arquivo | Placa | Função |
| `gateway/gateway.ino` | Arduino Nano #1 | Recebe nRF24, repassa serial |
| `sensor/sensor.ino` | Arduino Nano #2 | HC-SR04 → nRF24 |
| `atuador/atuador.ino` | Arduino Nano #3 | Buzzer + LED conforme distância |

### Dependências Arduino (Library Manager)

- `RF24` by TMRh20
- `printf.h` (inclusa na RF24)

### Pinagem

#### Gateway & Sensor & Atuador — nRF24L01

| nRF24 | Arduino Nano |
| VCC | 3.3V |
| GND | GND |
| CE | D7 |
| CSN | D8 |
| SCK | D13 |
| MOSI | D11 |
| MISO | D12 |

#### Sensor — HC-SR04

| HC-SR04 | Arduino Nano |

| VCC | 5V |
| GND | GND |
| TRIG | D3 |
| ECHO | D4 |

#### Atuador

| Componente | Pino |
| Buzzer passivo | D5 |
| LED vermelho | D6 |
| LED amarelo | D9 |
| LED verde | D10 |

---

## Protocolo de Comunicação

Baseado em CSMA com controle de fluxo RTS/CTS:

Sensor                    Gateway/Atuador
  │── RTS ──────────────────▶│
  │◀─────────────────── CTS ─│
  │── DATA ─────────────────▶│
  │◀─────────────────── ACK ─│

- Checksum de 1 byte (soma dos bytes do cabeçalho + payload)
- Antes de transmitir, verifica se o canal está livre (`testCarrier`)
- Timeout de 500ms por etapa, até 3 retransmissões

### Formato do pacote

[ origem(1) | destino(1) | tipo(1) | tamanho(1) | payload(N) | checksum(1) ]

### Identificadores dos nós

| ID | Nó |
| 47 | Sensor (HC-SR04)
| 30 | Gateway
| 26 | Atuador (Buzzer/LED)

---

## Integração Front ↔ Back

O frontend faz polling em `/api/status` a cada ~500ms para atualizar a cena 3D e as métricas. O botão de liga/desliga chama `POST /api/toggle`.

Para integrar no `page.tsx`, substitua o slider de simulação por:

```ts
// Substitui o sliderDist pelo dado real
useEffect(() => {
  if (!isActive) return;
  const id = setInterval(async () => {
    const res = await fetch('http://localhost:3001/api/status');
    const data = await res.json();
    if (data.active && data.distance != null)
      setSliderDist(data.distance);
  }, 500);
  return () => clearInterval(id);
}, [isActive]);

// Liga/desliga no back junto com o estado local
const togglePower = useCallback(async () => {
  setIsActive(v => !v);
  await fetch('http://localhost:3001/api/toggle', { method: 'POST' });
}, []);
```
