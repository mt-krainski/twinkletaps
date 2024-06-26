from django.test import TestCase
from rest_framework.test import APIClient

from twinkletaps_be.apps.users.models import User

from ..models import Device, Tap


class DeviceViewTestCase(TestCase):
    def setUp(self):
        """Prepare for the tests."""
        self.context = {}

        test_user = User.objects.create_user("Test", password="test")  # noqa: S106
        test_user.save()
        self.context["test_user"] = test_user

        created_device = Device(name="test device", owner=self.context["test_user"])
        created_device.save()
        self.context["test_device"] = created_device

        client = APIClient(headers={"accept": "application/json"})
        self.context["client"] = client

    def test_create_tap(self):
        """Test view for creating taps."""
        response = self.context["client"].post(
            "/taps/taps/",
            {
                "creator": self.context["test_user"].id,
                "group": "Test Group",
                "sequence": "1111111111",
                "device": self.context["test_device"].id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        created_object = response.json()

        self.assertIsNotNone(created_object["id"])
        self.assertEqual(created_object["group"], "Test Group")
        self.assertEqual(created_object["sequence"], "1111111111")
        self.assertEqual(created_object["device"], str(self.context["test_device"].id))
        self.assertEqual(
            created_object["device_owner"], str(self.context["test_device"].owner.id)
        )
        self.assertIn(created_object["id"], created_object["url"])

    def test_list_taps(self):
        """Test view for listing taps."""
        response = self.context["client"].get("/taps/taps/")

        devices = response.json()
        self.assertEqual(len(devices), 0)

        created_tap = Tap(
            creator=self.context["test_user"],
            sequence="1111111111",
            device=self.context["test_device"],
            group="Test Group",
        )
        created_tap.save()
        response = self.context["client"].get("/taps/taps/")
        devices = response.json()
        self.assertEqual(len(devices), 1)
        self.assertEqual(str(created_tap.id), devices[0]["id"])
        self.assertEqual(str(created_tap.creator_id), devices[0]["creator"])

    def test_get_tap_detail(self):
        """Test GET individual tap."""
        created_tap = Tap(
            creator=self.context["test_user"],
            sequence="1111111111",
            device=self.context["test_device"],
            group="Test Group",
        )
        created_tap.save()

        response = self.context["client"].get(f"/taps/taps/{created_tap.id}/")
        self.assertEqual(response.status_code, 200)
        tap_response_data = response.json()
        self.assertEqual(tap_response_data["id"], str(created_tap.id))
        self.assertEqual(
            tap_response_data["creator"], str(self.context["test_user"].id)
        )
        self.assertEqual(tap_response_data["group"], "Test Group")
        self.assertEqual(tap_response_data["sequence"], "1111111111")
        self.assertEqual(
            tap_response_data["device"], str(self.context["test_device"].id)
        )
        self.assertEqual(
            tap_response_data["device_owner"], str(self.context["test_device"].owner.id)
        )
        self.assertIsNotNone(tap_response_data["created_at"])
        self.assertIn(str(created_tap.id), tap_response_data["url"])

    def test_delete_tap(self):
        """Test view for deleting taps."""
        created_tap = Tap(
            creator=self.context["test_user"],
            sequence="1111111111",
            device=self.context["test_device"],
            group="Test Group",
        )
        created_tap.save()
        self.assertEqual(Tap.objects.count(), 1)

        response = self.context["client"].delete(f"/taps/taps/{created_tap.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertEqual(Tap.objects.count(), 0)

    def test_get_tap_as_simple(self):
        """Test GET only sequence from tap."""
        created_tap = Tap(
            creator=self.context["test_user"],
            sequence="10101010",
            device=self.context["test_device"],
            group="Test Group",
        )
        created_tap.save()

        response = self.context["client"].get(
            f"/taps/taps/{created_tap.id}/simple/", headers={"Accept": "text/plain"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, "10101010")
