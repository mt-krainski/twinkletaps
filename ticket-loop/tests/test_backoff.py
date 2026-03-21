"""Tests for BackoffTimer — exponential backoff logic."""

from unittest.mock import MagicMock

from ticket_loop.backoff import BackoffTimer

# -- defaults --


def test_initial_delay():
    """Default delay is 60 seconds."""
    timer = BackoffTimer()
    assert timer.delay == 60


def test_custom_initial_delay():
    """Respects constructor arg for initial_delay."""
    timer = BackoffTimer(initial_delay=10)
    assert timer.delay == 10


# -- step --


def test_step_doubles_delay():
    """step() multiplies delay by multiplier (default 2x)."""
    timer = BackoffTimer(initial_delay=60)
    timer.step()
    assert timer.delay == 120


def test_step_caps_at_max():
    """step() never exceeds max_delay."""
    timer = BackoffTimer(initial_delay=2000, max_delay=3600)
    timer.step()
    assert timer.delay == 3600


def test_step_already_at_max():
    """Stays at max_delay when already there."""
    timer = BackoffTimer(initial_delay=3600, max_delay=3600)
    timer.step()
    assert timer.delay == 3600


# -- reset --


def test_reset_returns_to_initial():
    """After stepping, reset() goes back to initial_delay."""
    timer = BackoffTimer(initial_delay=60)
    timer.step()
    timer.step()
    assert timer.delay != 60
    timer.reset()
    assert timer.delay == 60


# -- wait --


def test_wait_calls_sleep_with_delay():
    """wait() calls _sleep with the current delay value."""
    mock_sleep = MagicMock()
    timer = BackoffTimer(initial_delay=30)
    timer._sleep = mock_sleep

    timer.wait()

    mock_sleep.assert_called_once_with(30)


def test_wait_steps_after_sleep():
    """Delay increases after wait()."""
    mock_sleep = MagicMock()
    timer = BackoffTimer(initial_delay=30)
    timer._sleep = mock_sleep

    timer.wait()

    assert timer.delay == 60


# -- full sequence --


def test_backoff_sequence():
    """Full sequence: 60, 120, 240, 480, 960, 1920, 3600, 3600 (capped)."""
    timer = BackoffTimer()
    expected = [60, 120, 240, 480, 960, 1920, 3600, 3600]
    actual = []
    for _ in expected:
        actual.append(timer.delay)
        timer.step()
    assert actual == expected
