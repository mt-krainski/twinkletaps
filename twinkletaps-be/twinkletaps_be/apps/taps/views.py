# Create your views here.
from django.http import HttpResponse


def index(request):
    """Return sample response.

    Args:
        request (Request): Django Request object

    Returns:
        Response: Test response object
    """
    return HttpResponse("Hello, world. You're at the polls index.")
