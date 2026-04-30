import os
from django.apps import AppConfig


class GatewayConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "gateway"

    def ready(self):
        # Start serial thread only in the actual server process, not during
        # manage.py commands (migrate, shell, etc.) or the reloader watcher.
        # Under Daphne: DAPHNE=1 must be set in the run command.
        # Under runserver: RUN_MAIN=true is set by the reloader for the child.
        running_server = (
            os.environ.get("DAPHNE") == "1"
            or os.environ.get("RUN_MAIN") == "true"
        )
        if not running_server:
            return
        from .serial_worker import start_serial_thread
        start_serial_thread()
