# ReDuino-back

Backend do sistema IoT de sensor de ré para veículos. Servidor Django (API REST + WebSocket) que se comunica com os Arduinos via porta serial e com o frontend Next.js via WebSocket.

## Arquitetura do Sistema

```
Arduino 2 (ultrassom)
    │ RF24
    ▼
Arduino 1 (gateway)  ◄──────────────────────  Django Backend  ◄──►  Next.js Frontend
    │ Serial USB      ──── DIST:<cm>\n ────►    (porta 3001)          (porta 3000)
    │                 ◄─── LED:ON/OFF\n ────
    │ RF24
    ▼
Arduino 3 (LED aviso)
```

| Arduino | Função |
|---------|--------|
| 1 — Gateway | Intermedia a comunicação Serial ↔ RF24 |
| 2 — Sensor | Mede distância com ultrassom e envia via RF24 |
| 3 — LED | Acende/apaga conforme comando do backend |

## Protocolo Serial

**Arduino → Django:**
```
DIST:<float>\n    ex: DIST:34.50\n
```

**Django → Arduino:**
```
LED:ON\n
LED:OFF\n
```

## API REST

| Método | URL | Descrição |
|--------|-----|-----------|
| GET | `/api/sensor/readings/` | Lista de leituras (suporta `?critical=1`, `?limit=N`) |
| GET | `/api/sensor/readings/latest/` | Última leitura registrada |
| GET | `/admin/` | Django Admin |

## WebSocket

**URL:** `ws://localhost:3001/ws/sensor/proximity/`

**Mensagem recebida pelo frontend:**
```json
{
  "type": "proximity_update",
  "distance_cm": 34.5,
  "is_critical": false,
  "timestamp": "2026-04-29T21:45:00.123456+00:00"
}
```

## Instalação

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Editar .env: definir SECRET_KEY e SERIAL_PORT
python manage.py migrate
```

## Execução

```bash
DAPHNE=1 daphne -b 0.0.0.0 -p 3001 core.asgi:application
```

## Variáveis de Ambiente

Copie `.env.example` para `.env` e ajuste os valores:

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `SECRET_KEY` | — | Chave secreta Django (obrigatório) |
| `DEBUG` | `True` | Modo de depuração |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Hosts permitidos |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Origem do frontend |
| `SERIAL_PORT` | `/dev/ttyUSB0` | Porta serial do gateway Arduino |
| `SERIAL_BAUDRATE` | `9600` | Baudrate da comunicação serial |
| `CRITICAL_DISTANCE_CM` | `20` | Distância (cm) que aciona o alerta |
| `DB_NAME` | `db.sqlite3` | Nome do arquivo de banco de dados |

## Tecnologias

- **Django 5** + **Django REST Framework** — API REST
- **Django Channels 4** + **Daphne** — WebSocket (ASGI)
- **pyserial** — Comunicação serial com Arduino gateway
- **django-cors-headers** — CORS para o frontend Next.js
- **python-dotenv** — Carregamento do `.env`
