from django.urls import re_path
from .consumers import ProximityConsumer

websocket_urlpatterns = [
    re_path(r"^ws/sensor/proximity/$", ProximityConsumer.as_asgi()),
]
