#!/usr/bin/env python
# -*- coding: utf-8 -*-

__all__ = [
    'Line',
    'table_prefix',
]
import uuid
import xcat
from xcat import utils
from xcat import mopee, config
from tornado import gen
from app.models import AsyncModel, User

table_prefix = 'notesplanner'

cache = False
cache_cfg = config.get('cache', False)
cache_storage = cache_cfg.get('storage', 'Mongod')
if cache_cfg and hasattr(xcat.cache, cache_storage):
    Cache = getattr(xcat.cache, cache_storage)
    #print cache_cfg.get('config')
    cache = Cache(**cache_cfg.get('config', {}))


class Line(AsyncModel):
    _model_caches = {}

    class Meta:
        db_table = '%s%s' % (table_prefix, 'table')

    x = mopee.IntegerField(Integer)
    y = mopee.IntegerField((Integer)
    to_x = mopee.IntegerField((Integer)
    to_y = mopee.IntegerField((Integer)
    color = mopee.CharField(max_length=6)
    # board_id = Column(Integer, ForeignKey('boards.id'))

    def as_dict(self):
        line = {c.name: getattr(self, c.name) for c in self.__table__.columns}
        line['x_to'] = line.pop('to_x')
        line['y_to'] = line.pop('to_y')
        return line
