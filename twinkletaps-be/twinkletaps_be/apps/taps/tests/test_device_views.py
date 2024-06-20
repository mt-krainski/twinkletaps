from django.test import TestCase
from rest_framework.test import APIClient
from twinkletaps_be.apps.users.models import User

from ..models import Device


class DeviceViewTestCase(TestCase):
    def setUp(self):
        """Prepare for the tests."""
        test_user = User.objects.create_user("Test", password="test")  # noqa: S106
        test_user.save()

        self.context = {}
        self.context["test_user"] = test_user
        client = APIClient()
        self.context["client"] = client

    def test_create_device(self):
        response = self.context["client"].post(
            "/taps/devices/",
            {"name": "test device", "owner": self.context["test_user"].id},
            format="json",
        )

        created_object = response.json()

        self.assertIsNotNone(created_object["id"])
        self.assertIsNotNone(created_object["api_key"])
        self.assertEqual(created_object["name"], "test device")
        self.assertEqual(created_object["owner"], str(self.context["test_user"].id))
        self.assertIn(created_object["id"], created_object["url"])

    def test_list_devices(self):
        response = self.context["client"].get(
            "/taps/devices/",
            format="json",
        )

        devices = response.json()
        self.assertEqual(len(devices), 0)

        created_device = Device(name="test device", owner=self.context["test_user"])
        created_device.save()
        response = self.context["client"].get(
            "/taps/devices/",
            format="json",
        )
        devices = response.json()
        self.assertEqual(len(devices), 1)
        self.assertEqual(str(created_device.id), devices[0]["id"])
        self.assertEqual(str(created_device.owner_id), devices[0]["owner"])

    def test_delete_device(self):
        created_device = Device(name="test device", owner=self.context["test_user"])
        created_device.save()
        self.assertEqual(Device.objects.count(), 1)

        response = self.context["client"].delete(f"/taps/devices/{created_device.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(Device.objects.count(), 0)
