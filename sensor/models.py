from django.db import models


class ProximityReading(models.Model):
    distance_cm = models.FloatField()
    is_critical = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
        indexes = [models.Index(fields=["-timestamp"])]

    def __str__(self):
        return f"{self.distance_cm} cm @ {self.timestamp} [critical={self.is_critical}]"
