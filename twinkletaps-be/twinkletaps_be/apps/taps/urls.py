from django.urls import include, path
from rest_framework import routers, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.renderers import BrowsableAPIRenderer, JSONRenderer
from rest_framework.response import Response

from ..users.models import User
from .models import Device, Tap


class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ["url", "username", "email", "is_staff"]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


# Serializers define the API representation.
class DeviceSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Device
        fields = ["api_key", "id", "name", "owner", "owner_id", "url"]


# ViewSets define the view behavior.
class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer


class TapSerializer(serializers.HyperlinkedModelSerializer):
    device_owner_id = serializers.PrimaryKeyRelatedField(
        source="device.owner", read_only=True
    )
    device_owner = serializers.HyperlinkedRelatedField(
        source="device.owner", view_name="user-detail", read_only=True
    )

    class Meta:
        model = Tap
        fields = [
            "id",
            "created_at",
            "creator",
            "creator_id",
            "group",
            "sequence",
            "device",
            "device_id",
            "device_owner_id",
            "device_owner",
            "url",
        ]


# ViewSets define the view behavior.
class TapViewSet(viewsets.ModelViewSet):
    queryset = Tap.objects.all()
    serializer_class = TapSerializer
    renderer_classes = [
        BrowsableAPIRenderer,
        JSONRenderer,
    ]

    @action(detail=True)
    def simple(self, request, pk=None):
        """Return tap as a sequence.

        Args:
            request (Request): DRF Request object
            pk (str, optional): pk of the selected tap object. Defaults to None.

        Returns:
            Response: response containing selected tap's sequence
        """
        tap = self.get_object()
        return Response(tap.sequence)


# Routers provide an easy way of automatically determining the URL conf.
router = routers.DefaultRouter()
router.register(r"devices", DeviceViewSet)
router.register(r"users", UserViewSet)
router.register(r"taps", TapViewSet)


urlpatterns = [
    path("", include(router.urls)),
]
