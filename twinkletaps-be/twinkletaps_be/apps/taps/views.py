from rest_framework import routers, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.renderers import BrowsableAPIRenderer, JSONRenderer
from rest_framework.response import Response

from ..users.models import User
from .models import Device, Tap


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "url", "username", "email", "is_staff"]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


# Serializers define the API representation.
class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ["api_key", "id", "name", "owner", "url"]


# ViewSets define the view behavior.
class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all()
    serializer_class = DeviceSerializer


class TapSerializer(serializers.ModelSerializer):
    device_owner = serializers.PrimaryKeyRelatedField(
        source="device.owner", read_only=True
    )

    class Meta:
        model = Tap
        fields = [
            "id",
            "created_at",
            "creator",
            "group",
            "sequence",
            "device",
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
