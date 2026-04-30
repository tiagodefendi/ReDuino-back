import json
from channels.generic.websocket import AsyncWebsocketConsumer


class ProximityConsumer(AsyncWebsocketConsumer):
    GROUP_NAME = "proximity"

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        pass

    async def proximity_update(self, event):
        await self.send(text_data=json.dumps({
            "type": "proximity_update",
            "distance_cm": event["distance_cm"],
            "is_critical": event["is_critical"],
            "timestamp": event["timestamp"],
        }))
