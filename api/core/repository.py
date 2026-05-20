from abc import ABC, abstractmethod
from typing import List, Dict, Optional, TypeVar, Generic
from datetime import datetime

T = TypeVar('T', bound=Dict)

class BaseRepository(ABC, Generic[T]):
    """Abstract base for all repositories."""
    @abstractmethod
    def get_all(self, user_id: str) -> List[T]:
        pass

    @abstractmethod
    def get_by_id(self, user_id: str, id: str) -> Optional[T]:
        pass

    @abstractmethod
    def create(self, user_id: str, item: T) -> T:
        pass

    @abstractmethod
    def update(self, user_id: str, id: str, updates: Dict) -> Optional[T]:
        pass

    @abstractmethod
    def delete(self, user_id: str, id: str) -> bool:
        pass


class SimpleCache:
    """In‑memory cache with TTL. Optional but boosts performance."""
    def __init__(self, ttl: int = 10):
        self._store = {}
        self.ttl = ttl

    def get(self, key: str):
        if key in self._store:
            value, timestamp = self._store[key]
            if (datetime.utcnow() - timestamp).total_seconds() < self.ttl:
                return value
            else:
                del self._store[key]
        return None

    def set(self, key: str, value):
        self._store[key] = (value, datetime.utcnow())

    def invalidate(self, prefix: str = None):
        if prefix is None:
            self._store.clear()
        else:
            keys_to_del = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_del:
                del self._store[k]