from django.test import TestCase

from ...users.models import User
from ..models import Device, Tap


class ModelsTestCase(TestCase):

    def setUp(self):
        """Prepare for the tests."""
        test_user = User.objects.create_user("Test", password="test")  # noqa: S106
        test_user.save()

        self.context = {"test_user": test_user}

    def test_create_device(self):
        """Test operations related to creating a Device instance."""
        test_device = Device(name="test device", owner=self.context["test_user"])
        test_device.save()

        self.assertIsNotNone(test_device.id)
        self.assertIsNotNone(test_device.api_key)

    def test_create_tap(self):
        """Test operations related to creating a Tap instance."""
        test_device = Device(name="test device", owner=self.context["test_user"])
        test_device.save()

        test_tap = Tap(
            creator=self.context["test_user"],
            sequence="10101",
            device=test_device,
            group="test",
        )
        test_tap.save()

        self.assertIsNotNone(test_tap.id)
