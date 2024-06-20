from .core import *  # noqa: F403

INSTALLED_APPS.append("django_extensions")  # noqa: F405
REST_FRAMEWORK["TEST_REQUEST_DEFAULT_FORMAT"] = "json"
