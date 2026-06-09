# ReDuino — Back-end

> Servidor Node.js que faz a ponte entre o Arduino Gateway (serial USB) e o dashboard web do sistema de sensor de ré ReDuino.

---

## Visão Geral

O **ReDuino-back** é a camada de integração do projeto ReDuino: ele lê os pacotes enviados pelo Arduino Gateway via porta serial, mantém o estado atual do sistema (distância, alertas, ativação) e expõe uma API REST para o front-end Next.js consumir.

```
[HC-SR04 Sensor]                         [Buzzer / LEDs]
      │                                         │
[Arduino Sensor ID=47] ──── nRF24L01 ────  [Arduino Atuador ID=60]
                                  │
                       [Arduino Gateway ID=30]
                                  │ USB / Serial (19200 baud)
                         [Node.js Back-end]  ◄── este repositório
                                  │ REST API
                          [Next.js Front-end]
                                  │
                        [Smartphone / Browser]
```

### Repositórios do projeto

| Repositório | Descrição |
|---|---|
| [`ReDuino-IoT`](https://github.com/tiagodefendi/ReDuino-IoT) | Sketches Arduino (sensor, gateway, atuador) |
| [`ReDuino-back`](https://github.com/tiagodefendi/ReDuino-back) | Servidor Node.js — **este repositório** |
| [`ReDuino-Front`](https://github.com/tiagodefendi/ReDuino-Front) | Dashboard Next.js com cena 3D |

---

## Pré-requisitos

- **Node.js** >= 18
- **npm** >= 9
- Arduino Nano (gateway, ID=30) conectado via USB à máquina

---

## Instalação

```bash
git clone https://github.com/tiagodefendi/ReDuino-back.git
cd ReDuino-back
```

---

## Configuração

Crie um arquivo `.env` na raiz do projeto (ou edite o `.env` já presente):

```env
# Porta serial onde o Arduino Gateway está conectado
SERIAL_PORT=/dev/ttyUSB0      # Linux/macOS
# SERIAL_PORT=COM3            # Windows

# Baud rate da comunicação serial
BAUD_RATE=19200

# Porta HTTP do servidor
PORT=3001

# URL do front-end (para liberação de CORS)
FRONTEND_URL=http://localhost:3000

# ID do nó sensor na rede RF
SENSOR_NODE_ID=47
```

> **Dica Windows:** descubra a porta COM correta em Gerenciador de Dispositivos → Portas (COM e LPT).  
> **Dica Linux:** verifique com `ls /dev/ttyUSB*` ou `ls /dev/ttyACM*` após conectar o Arduino.

---

## Executando

```bash
node index.js
```

O servidor sobe em `http://localhost:3001` (ou na porta definida em `PORT`).


## Estrutura do Projeto

```
ReDuino-back/
├── src/
│   ├── config/        # Configurações de serial e ambiente
│   ├── state/         # Estado global do sistema (distância, alertas)
│   └── routes/        # Rotas Express (status, toggle, messages, health)
├── index.js           # Entry point — inicializa serial e Express
├── package.json
└── .env
```
