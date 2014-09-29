#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Date    : 2013-08-24 11:07:21
# @Author  : vfasky (vfasky@gmail.com)
# @Link    : http://vfasky.com
# @Version : $Id$

import sys
reload(sys)
sys.setdefaultencoding('utf8')

import logging
log = logging.getLogger(__name__)
log.setLevel(logging.DEBUG)

import os
from tornado.options import define, options, parse_command_line
from sockjs.tornado import SockJSRouter, SockJSConnection
import json

# 定义参数
define('port', default=80, type=int)
define('model', default='devel')
define('psycopg2_impl', default='psycopg2')

parse_command_line()

psycopg2_impl = options.psycopg2_impl

if psycopg2_impl == 'psycopg2cffi':
    from psycopg2cffi import compat
    compat.register()
elif psycopg2_impl == 'psycopg2ct':
    from psycopg2ct import compat
    compat.register()

from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from xcat import config
from xcat.web import Application
from config import settings


# 设置运行模式
settings['run_mode'] = options.model
config.load(settings)

# 连接数据库，长连接
config.get('database').connect()

# uimodules
from app import uimodules
config.set('ui_modules', uimodules)

class EchoConnection(SockJSConnection):

    noteplanners = dict()
    current = 0
    total = 0


    # @property
    # def sa_session(self):
    #     if not self._sa_session:
    #         self._sa_session = self.backend.get_session()
    #     return self._sa_session

    def on_open(self, request):
        pass
        # if not self.session.noteplanner in self.noteplanners:
        #     self.noteplanners[self.session.noteplanner] = set()
        # self.noteplanners[self.session.noteplanner].add(self)

    def on_close(self):
        pass

    def on_message(self, msg):
        msg = json.loads(msg)
        dispatch = getattr(self, msg['method'], None)
        try:
            log.debug("Dispatch: {0} ".format(msg['method']))
            # dispatch(**msg)
        except Exception as ex:
            log.info("Not implemented {0} {1}".format(msg['method'], ex))

    def emit(self, msg, data):
        self.send({'method': msg, 'data': data})

    def drawLine(self, *args, **kwargs):
        self.broadcast(self.noteplanners[self.session.noteplanner].difference((self, )), kwargs)

        board = self.sa_session.query(Board).filter(Board.board_id == self.session.noteplanner).first()

        data = kwargs['data']
        line = Line()
        line.x = data['x']
        line.y = data['y']
        line.to_x = data['x_to']
        line.to_y = data['y_to']
        line.color = data['color']
        line.board_id = board.id

        self.sa_session.add(line)
        self.sa_session.commit()

    # A user is clearing all the lines
    def clearLines(self, *args, **kwargs):
        self.broadcast(self.noteplanners[self.session.noteplanner].difference((self, )), kwargs)
        # TODO: remove the line from the database


   # The main call to frontend for drawing and local vars
    def drawAndSetLocals(self, planner=""):
        current = 0

        planner['id'] = planner['board_id']
        planner['title'] = planner['name']
        planner['rowlabels'] = eval(planner['rowlabels'])
        planner['columnlabels'] = eval(planner['columnlabels'])
        planner['statuslabels'] = eval(planner['statuslabels'])
        planner['notecategories'] = eval(planner['notecategories'])

        self.setLocals(planner, current, self.total)
        self.drawPlanner(planner)

    # Set the local vars
    def setLocals(self, planner, current, total):
        self.noteplanners[self.session.noteplanner].remove(self)
        self.session.noteplanner = planner['id']
        if not self.session.noteplanner in self.noteplanners:
            self.noteplanners[self.session.noteplanner] = set()
        self.noteplanners[self.session.noteplanner].add(self)

        self.current = current + 1
        self.total = total

    def drawPlanner(self, planner):
        # Clear the planner
        self.emit('clearNotes', {})
        self.emit('clearLines', {})

        # This is for the ui, current and total planners
        planner['current'] = 0
        planner['total'] = 1

        # Get the lines
        try:
            lines = planner.pop('lines')
        except:
            lines = []

        # Get the notes
        try:
            notes = planner.pop('notes')
        except:
            notes = []

        self.emit('drawBackground', planner)

        for note in notes:
            note['id'] = note.pop('note_id')
            self.emit('addNote', note)

        for line in lines:
            self.emit('drawLine', line)

    def deletePlanner(self, *args, **kwargs):
        board = self.sa_session.query(Board).filter_by(
            board_id=self.session.noteplanner).first()
        self.sa_session.delete(board)
        self.sa_session.commit()

        self.noteplanners[self.session.noteplanner].remove(self)
        self.session.noteplanner = -1
        self.noteplanners[self.session.noteplanner] = set()
        self.noteplanners[self.session.noteplanner].add(self)

    def setBackground(self, *args, **kwargs):
        self.broadcast(self.noteplanners[self.session.noteplanner].difference((self, )), kwargs)

        board = self.sa_session.query(Board).filter(Board.board_id == self.session.noteplanner).first()

        board.name = kwargs['data']['title']
        board.columnparts = kwargs['data']['columnparts']
        board.statusheight = kwargs['data']['statusheight']
        board.rowlabels = str(kwargs['data']['rowlabels'])
        board.columnlabels = str(kwargs['data']['columnlabels'])
        board.statuslabels = str(kwargs['data']['statuslabels'])
        board.notecategories = str(kwargs['data']['notecategories'])

        self.sa_session.commit()

    def nextPlanner(self, *args, **kwargs):
        board = self.sa_session.query(Board).filter(Board.board_id == self.session.noteplanner).first()

        next_board = self.sa_session.query(Board).filter(Board.id > board.id).order_by(Board.created).first()
        if next_board:
            next_board_asdict = next_board.as_dict()
            next_board_asdict['notes'] = [x.as_dict() for x in next_board.notes]
            next_board_asdict['lines'] = [x.as_dict() for x in next_board.lines]

            self.drawAndSetLocals(next_board_asdict)

    def prevPlanner(self, *args, **kwargs):
        board = self.sa_session.query(Board).filter(Board.board_id == self.session.noteplanner).first()

        prev_board = self.sa_session.query(Board).filter(Board.id < board.id).order_by(Board.created.desc()).first()
        if prev_board:
            prev_board_asdict = prev_board.as_dict()
            prev_board_asdict['notes'] = [x.as_dict() for x in prev_board.notes]
            prev_board_asdict['lines'] = [x.as_dict() for x in prev_board.lines]

            self.drawAndSetLocals(prev_board_asdict)

if __name__ == '__main__':
    EchoRouter = SockJSRouter(EchoConnection, '/test')

    from app.handlers import *
    application = Application(**config.get())
    application.add_handlers(".*$", EchoRouter.urls)
    http_server = HTTPServer(application, no_keep_alive=True)
    http_server.listen(options.port)
    IOLoop.instance().start()
