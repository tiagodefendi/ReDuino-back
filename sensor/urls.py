from django.urls import path
from .views import ProximityReadingListView, LatestReadingView

urlpatterns = [
    path("readings/", ProximityReadingListView.as_view(), name="readings-list"),
    path("readings/latest/", LatestReadingView.as_view(), name="readings-latest"),
]
