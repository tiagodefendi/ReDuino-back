from rest_framework import serializers
from .models import ProximityReading


class ProximityReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProximityReading
        fields = ["id", "distance_cm", "is_critical", "timestamp"]
        read_only_fields = ["id", "timestamp"]
