from rest_framework import generics, filters
from rest_framework.response import Response
from .models import ProximityReading
from .serializers import ProximityReadingSerializer


class ProximityReadingListView(generics.ListAPIView):
    serializer_class = ProximityReadingSerializer
    filter_backends = [filters.OrderingFilter]
    ordering = ["-timestamp"]

    def get_queryset(self):
        qs = ProximityReading.objects.all()
        if self.request.query_params.get("critical") == "1":
            qs = qs.filter(is_critical=True)
        limit = self.request.query_params.get("limit")
        if limit:
            try:
                qs = qs[: int(limit)]
            except ValueError:
                pass
        return qs


class LatestReadingView(generics.RetrieveAPIView):
    serializer_class = ProximityReadingSerializer

    def get(self, request, *args, **kwargs):
        reading = ProximityReading.objects.first()
        if reading is None:
            return Response(None)
        serializer = self.get_serializer(reading)
        return Response(serializer.data)
