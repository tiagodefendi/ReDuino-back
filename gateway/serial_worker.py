import threading
import logging

import serial
from django.conf import settings
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

_serial_conn: "serial.Serial | None" = None
_worker_thread: "threading.Thread | None" = None


def _open_serial() -> serial.Serial:
    return serial.Serial(
        port=settings.SERIAL_PORT,
        baudrate=settings.SERIAL_BAUDRATE,
        timeout=2,
    )


def send_led_command(state: bool) -> None:
    if _serial_conn is None or not _serial_conn.is_open:
        logger.warning("Serial not open; cannot send LED command.")
        return
    cmd = b"LED:ON\n" if state else b"LED:OFF\n"
    _serial_conn.write(cmd)
    logger.debug("Sent serial command: %s", cmd)


def _process_line(line: str) -> None:
    from sensor.models import ProximityReading  # late import avoids AppRegistryNotReady

    line = line.strip()
    if not line.startswith("DIST:"):
        logger.debug("Ignored non-DIST line: %s", line)
        return

    try:
        distance_cm = float(line.split(":")[1])
    except (IndexError, ValueError):
        logger.warning("Malformed distance line: %s", line)
        return

    is_critical = distance_cm < settings.CRITICAL_DISTANCE_CM

    reading = ProximityReading.objects.create(
        distance_cm=distance_cm,
        is_critical=is_critical,
    )

    send_led_command(state=is_critical)

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "proximity",
        {
            "type": "proximity.update",
            "distance_cm": distance_cm,
            "is_critical": is_critical,
            "timestamp": reading.timestamp.isoformat(),
        },
    )
    logger.info("Reading saved: %.1f cm (critical=%s)", distance_cm, is_critical)


def _serial_loop() -> None:
    global _serial_conn
    try:
        _serial_conn = _open_serial()
        logger.info(
            "Serial port %s opened at %d baud.",
            settings.SERIAL_PORT,
            settings.SERIAL_BAUDRATE,
        )
        while True:
            try:
                raw = _serial_conn.readline()
                if not raw:
                    continue
                line = raw.decode("utf-8", errors="replace")
                _process_line(line)
            except serial.SerialException as exc:
                logger.error("Serial read error: %s", exc)
                break
    except serial.SerialException as exc:
        logger.error("Cannot open serial port %s: %s", settings.SERIAL_PORT, exc)
    finally:
        if _serial_conn and _serial_conn.is_open:
            _serial_conn.close()
        logger.warning("Serial thread exited.")


def start_serial_thread() -> None:
    global _worker_thread
    _worker_thread = threading.Thread(
        target=_serial_loop,
        name="serial-worker",
        daemon=True,
    )
    _worker_thread.start()
    logger.info("Serial worker thread started.")
