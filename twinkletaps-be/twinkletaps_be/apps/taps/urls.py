from django.urls import include, path
from rest_framework import routers

from .views import DeviceViewSet, TapViewSet, UserViewSet

# Routers provide an easy way of automatically determining the URL conf.
router = routers.DefaultRouter()
router.register(r"devices", DeviceViewSet)
router.register(r"users", UserViewSet)
router.register(r"taps", TapViewSet)


urlpatterns = [
    path("", include(router.urls)),
]
