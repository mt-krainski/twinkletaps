from typing import Optional


class RedisBoolean:
    def __init__(self, redis, label, initial_value: Optional[bool] = None):
        self.redis = redis
        self.label = label
        if initial_value is not None:
            self.set(initial_value)

    def _get(self, redis_or_pipeline):
        value = redis_or_pipeline.get(self.label)
        if value == b"True":
            return True
        return False

    def get(self):
        return self._get(self.redis)

    def _set(self, value: bool, redis_or_pipeline):
        redis_or_pipeline.set(self.label, str(value))
        return value

    def set(self, value):
        return self._set(value, self.redis)

    def toggle(self):
        # TODO: Fix this, make this a transaction
        new_value = not self.get()
        self.set(new_value)
        return new_value
