"""Exponential backoff timer for polling loops."""

import time


class BackoffTimer:
    """Timer with exponential backoff, configurable limits, and reset."""

    def __init__(
        self,
        initial_delay: float = 60,
        multiplier: float = 2.0,
        max_delay: float = 3600,
    ) -> None:
        """Initialize with delay parameters."""
        self._initial_delay = initial_delay
        self._multiplier = multiplier
        self._max_delay = max_delay
        self._current_delay = initial_delay
        self._sleep = time.sleep

    @property
    def delay(self) -> float:
        """Return current delay in seconds."""
        return self._current_delay

    def step(self) -> None:
        """Advance to the next delay (multiply, cap at max)."""
        self._current_delay = min(
            self._current_delay * self._multiplier, self._max_delay
        )

    def reset(self) -> None:
        """Return to initial_delay."""
        self._current_delay = self._initial_delay

    def wait(self) -> None:
        """Sleep for the current delay, then step."""
        self._sleep(self._current_delay)
        self.step()
