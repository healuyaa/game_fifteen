
const http = require('http');
const url = require('url');
const webSocket = require('ws');

module.exports = class D1WS 
{
  constructor(authCallBack) 
  {
    

    this.authCB = authCallBack;
    this.wss = new webSocket.Server({ noServer: true });
    this.timer = null;

    this.wss.on('connection', function connection(ws, request, handlers, authHandler, socket) 
    {
      ws.isAlive = true;
      if (request.headers['x-real-ip'] === undefined)
        logger.info('D1WS: new connection from ' + socket.remoteAddress);
      else
        logger.info('D1WS: new connection from ' + request.headers['x-real-ip']);

      const hdl = this.getHttpHandler(request.method, handlers, request);
      if (hdl !== null) 
      {
        if (hdl.auth && !authHandler(hdl, request)) 
        {
          //socket.destroy();
          return this.handleWsError('D1WS: you have not permissions to access to this object', url.parse(request.url, true), ws);
        };

        ws.on('message', function message(msg) 
        {
          if (hdl.handlerIn)
            hdl.handlerIn(hdl, ws, msg);

          console.log('D1WS: received message \"' + msg + '\"');
        });
        
        ws.on('pong', function () 
        {
          this.isAlive = true;
        });

        ws.on('close', function () 
        {
          if (request.headers['x-real-ip'] === undefined)
            logger.info('D1WS: connection from ' + socket.remoteAddress + ' closed');
          else
            logger.info('D1WS: connection from ' + request.headers['x-real-ip'] + ' closed');

          hdl.handlerClose(ws);
        });

        ws.path = hdl.path;
        this.setWsResponse(hdl, request, ws);

      } else
        this.handleWsError('D1WS: handler not found', url.parse(request.url, true), ws);;

    }.bind(this));

    const interval = setInterval(function ping() 
    {
      this.wss.clients.forEach(function each(ws) 
      {
        if (ws.isAlive === false)
          return ws.terminate();

        ws.isAlive = false;
        ws.ping('ping');
      });

    }.bind(this), 60000);
  }

  //=====================================================================================================================================
  // 
  // { method: 'GET', path: '/api/getNodes', stream: false, handler: <func> } - HTTP
  // { method: 'GET', path: '/api/getNodes', stream: false, handler: <func>, handlerIn: <func> } - WS
  // { result: true, data: '', contentType: 'application/json'}

  startHttp(address, port, getHandlers, getHandlersWs, authHandler) 
  {
    this.http = require('http');
    this.http.globalAgent.maxSockets = 2048;
    this.httpServer = this.http.createServer();

    this.httpServer.on('request', function request(request, response) 
    {
      const hdl = this.getHttpHandler(request.method, getHandlers, request);
      if (hdl !== null) 
      {
        if (hdl.auth && !authHandler(hdl, request))
          return this.handleHttpError(401, 'You have not permissions to access to this object', url.parse(request.url, true), response);

        if (hdl.method !== 'POST' && hdl.method !== 'PUT') 
        {
          this.setHttpResponse(hdl, request, response);
        } else 
        {
          if (!hdl.bin) {
            let body = '';

            request.on('data', chunk => {
              body += chunk.toString();
            });
            request.on('end', () => {
              this.setHttpResponse(hdl, request, response, body);
            });

          } else {
            let userData = {};
            request.on('data', chunk => {
              this.setHttpResponse(hdl, request, response, chunk, userData);
            });
            request.on('end', () => {
              this.setHttpResponse(hdl, request, response, null, userData);
            });
          }
        };

      } else
        this.handleHttpError(404, 'Handler not found', url.parse(request.url, true), response);

    }.bind(this));

    if (getHandlersWs) 
    {
      this.httpServer.on('upgrade', function upgrade(request, socket, head) 
      {
        this.wss.handleUpgrade(request, socket, head, function done(ws) 
        {
          this.wss.emit('connection', ws, request, getHandlersWs, authHandler, socket);
        }.bind(this));

      }.bind(this));
    };

    this.httpServer.listen(port, address);
  };

  //=====================================================================================================================================
  //

  getHttpHandler(method, handlers, request) 
  {
    let urlParts = url.parse(request.url, true);
    //console.log(handlers, urlParts);
    for (let i = 0; i < handlers.length; i++) {
      if (handlers[i].method === method) {
        if (handlers[i].path === urlParts.pathname) {
          handlers[i].urlParts = urlParts;
          return handlers[i];
        } else {
//          console.log("1" + handlers[i].method.substring(0, handlers[i].method.length - 2));
//          console.log("2" + urlParts.pathname.substring(0, handlers[i].method.length - 2));
          if (handlers[i].path.endsWith('/*') && 
            urlParts.pathname.length >= handlers[i].path.length - 2 &&
            handlers[i].path.substring(0, handlers[i].path.length - 2) == urlParts.pathname.substring(0, handlers[i].path.length - 2)) {
            handlers[i].urlParts = urlParts;
            return handlers[i];
          };
        }
      } 
    };
    return null;
  }

  setHttpResponse(handler, request, response, body, userData) 
  {
    if (!handler.stream) 
    {
      const respOut = handler.handler(handler.urlParts, request, response, body);
      if (respOut.result) {
        response.setHeader('Content-Type', respOut.contentType);
        response.end(JSON.stringify(respOut.data));
      } else
        this.handleHttpError(500, 'Error: ' + respOut.error, url.parse(request.url, true), response);
    } else
      handler.handler(handler.urlParts, request, response, body, userData);
  }

  setWsResponse(handler, request, ws) 
  {
    if (!handler.stream) 
    {
      const respOut = handler.handler(handler.urlParts, ws);
      if (respOut.result)
        ws.send(JSON.stringify(respOut.data));
      else
        this.handleWsError('Error: ' + respOut.error, url.parse(request.url, true), ws);
    } else
      handler.handler(handler.urlParts, ws);
  }

  send(path, msg) 
  {
    this.wss.clients.forEach(function each(ws) 
    {
      if (ws.path === path) {
        ws.send(JSON.stringify(msg));
      }
    });
  }

  //=====================================================================================================================================
  //

  handleHttpError(code, msg, urlParts, response) 
  {
    response.writeHead(code, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ result: false, error: 'Internal server error in ' + urlParts.pathname + '. Msg:  ' + msg }));
  };

  handleWsError(msg, urlParts, ws) 
  {
    ws.send(JSON.stringify({ type: 'result', data: { result: false, error: 'Internal server error in ' + urlParts.pathname + '. Msg:  ' + msg } }));
    ws.terminate();
  };

  //=====================================================================================================================================
  // HTTP client

  httpRequest(url, funcOK, funcFail, respOut) 
  {
    const options =
    {
      agent: false,
      headers: {
        'Connection': 'close'
      },
      timeout: 5000
    };

    const request = http.get(url, options, (resp) => 
    {
      const type = resp.headers['content-type'];
      if (type === 'application/json' || respOut === null) 
      {
        let data = '';
        resp.on('data', (chunk) => 
        {
          data += chunk;
        });

        resp.on('end', () => 
        {
          funcOK(data, resp);
        });
      } else 
      {
        respOut.setHeader('Content-Type', type);

        if (resp.headers['content-length'] !== undefined)
          respOut.setHeader('Content-Length', resp.headers['content-length']);

        resp.on('data', (chunk) => 
        {
          respOut.write(chunk);
        });

        resp.on('end', () => 
        {
          respOut.end();
        });
      }
    }).on("error", (err) => 
    {
      funcFail(err.message);
    });

    return request;
  }

  //-------------------------------------------------------------------------------------------------------------

  httpPost(addr, port, srv, contentType, body, funcOK, funcFail) 
  {
    const post_options =
    {
      host: addr,
      family: 4,
      port: port,
      path: srv,
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Content-Length': body.length
      }
    };

    const post_req = http.request(post_options, (res) => 
    {
      res.setEncoding('utf8');
      let data = '';

      res.on('data', function (chunk) {
        data += chunk;
      });

      res.on('end', () => 
      {
        funcOK(data);
      });
    });

    post_req.on("error", (err) => 
    {
      funcFail(err.message);
    });

    post_req.write(body);
    post_req.end();

    return post_req;
  }
};
