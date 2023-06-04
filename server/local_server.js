const { spawn } = require('child_process');
const url = require('url');
const fs = require('fs');
const qs = require('querystring');
const uuidv4 = require('uuid/v4');
const mysql = require('mysql');
const scheduler = require('node-schedule');
const dateFormat = require('dateformat');
const util = require('util');
const graphviz = require('graphviz');
const mqtt = require("mqtt");
const plantuml = require('node-plantuml');
const express = require('express');
const moment = require('moment');

const ws_class = require('./ws.js');

//=====================================================================================================================================
// D1Hub7 main file

global.intel = require('intel');
intel.config({
    formatters: {
      'simple': {
        'format': '[%(levelname)s] %(message)s',
        'colorize': true
      },
      'details': {
        'format': '[%(date)s] %(name)s.%(levelname)s: %(message)s',
        'strip': true
      }
    },
    handlers: {
      'terminal': {
        'class': intel.handlers.Console,
        'formatter': 'simple',
        'level': intel.INFO
      },
      'logfile': {
        'class': intel.handlers.File,
        'level': intel.INFO,
        'file': './log/test_server.log',
        'formatter': 'details'
      }
    },
    loggers: {
      'TEST_SERVER': {
        'handlers': ['terminal', 'logfile'],
        'level': 'INFO',
        'handleExceptions': true,
        'exitOnError': false,
        'propagate': true
      }
    }
  });

global.logger = intel.getLogger('TEST_SERVER');
logger.setLevel(intel.INFO);

const ws = new ws_class();
let wsTimerEvents = false;
let msgCounter = 1;

global.console.log = (msg) =>
{
    logger.info(msg);
}

    function eventsConnectedWs(urlParts, ws)
    {
	ws.timer = setInterval(() => {
           if (wsTimerEvents) {
	     const msg = {sid: (msgCounter++).toString(), cid: -2, type: 'message', source: '*', destination: '*', crtdt: moment().format('YYYY-MM-DDThh:mm:ss[Z]'), data: {msg: 'Таймерное сообщение №' + msgCounter, code: 1000}, sent: false, delivered: false, hide: true};
	     ws.send(JSON.stringify(msg));
	   }
	}, 3000);

	const msgStart = {sid: (msgCounter++).toString(), cid: -1, type: 'status', source: '*', destination: '*', crtdt: moment().format('YYYY-MM-DDThh:mm:ss[Z]'), data: {code: 200, value: {msg: 'Подключено'}}, sent: false, delivered: false};
	ws.send(JSON.stringify(msgStart));
        return { result: true, data: {} };
    }

    function eventsInWs(hdl, ws, inMsg)
    {
        const msg = JSON.parse(inMsg);
        if (msg.type == 'cmd') {
          if (msg.data.cmd == 'timerEvents') {
             wsTimerEvents = msg.data.value == 'on'? true : false;
          }
	  console.log('cmd: ' + JSON.stringify(msg.data));

        } else {

          msg.sid = (msgCounter++).toString();
  	  msg.sent = true;
          ws.send(JSON.stringify(msg));
	  console.log(msg.sid + ' sent');

	  setTimeout(() => {
	    console.log(msg.sid + ' delivered');
            msg.type = 'ack';
            msg.data = {code: 0, msg: ''};
            msg.delivered = true;
 	    ws.send(JSON.stringify(msg));
	  }, 3000);

	} 
    }

    function eventsCloseWs(ws) 
    {
       if (ws.timer) {
         clearTimeout(ws.timer);
         ws.timer = null;
       }
    }

//----------------------------------------------------------------------------------------------------------------------

let projects = [];
let ppds = [];
let routes = [];
let files = [];
let comments = [];

function getNewOid(arr) 
{
  let oid = 1;
  arr.forEach((p) => {
     if (p.oid > oid)
       oid = p.oid;
  });
  return oid + 1;
}

function updateByOid(element, arr) {
   for (let i = 0; i < arr.length; i ++) {
     if (arr[i].oid == element.oid) {
       arr[i] = element;
       return i;
     }
   }
   return -1;
}

function deleteByOid(oid, arr) {
   for (let i = 0; i < arr.length; i ++) {
     if (arr[i].oid == oid) {
       const ret = {oid: arr[i].oid, deldt: moment().utc().format('YYYY-MM-DDThh:mm:ss[Z]')};
       arr.splice(i, 1);
       return ret;
     }
   }
   return null;
}

function toList(obj) {
  return {total: obj.length, rows: obj};
}

function readDB() {
  fs.readFile("db/projects.json", (err, data) => {
    if (!err)
      projects = JSON.parse(data);
  });
  fs.readFile("db/ppds.json", (err, data) => {
    if (!err)
      ppds = JSON.parse(data);
  });
  fs.readFile("db/routes.json", (err, data) => {
    if (!err)
      routes = JSON.parse(data);
  });
  fs.readFile("db/files.json", (err, data) => {
    if (!err)
      files = JSON.parse(data);
  });
  fs.readFile("db/comments.json", (err, data) => {
    if (!err)
      comments = JSON.parse(data);
  });
}

function writeDB() {
  fs.writeFile("db/projects.json", JSON.stringify(projects), () => {});
  fs.writeFile("db/ppds.json", JSON.stringify(ppds), () => {});
  fs.writeFile("db/routes.json", JSON.stringify(routes), () => {});
}

function writeProjects() {
  fs.writeFile("db/projects.json", JSON.stringify(projects), () => {});
}
function writePpds() {
  fs.writeFile("db/ppds.json", JSON.stringify(ppds), () => {});
}
function writeRoutes() {
  fs.writeFile("db/routes.json", JSON.stringify(routes), () => {});
}
function writeFiles() {
  fs.writeFile("db/files.json", JSON.stringify(files), () => {});
}
function writeComments() {
  fs.writeFile("db/comments.json", JSON.stringify(comments), () => {});
}


//----------------------------------------------------------------------------------------------------------------------


function checkAuth(username, password) 
{
	return true;
}

function login(urlParts, request, response, body)
{
//        const type = urlParts.query.type;
    
        const out = {authorization: '1234567890', user: {userName: 'dima', certSN: '40e588736e8f973100001bbf',
          role: {name: 'Администратор', sid: 'admin', admin: true, creator: false, readOnly: false,  privs: []}, 
          employee: {fio: 'Иванов Иван Иванович', phone: '+375162268899', email: 'ivanonoff@qqq.rw', organization: null, division: null, position: null} ,
          participant: {name: 'НОДМ-2', descr: 'Отдел грузовой работы 2', sid: 'nodm-2', groupSid: 'nodm', privs: ['add_part', 'down_level']} 
          }
        };
        response.end(JSON.stringify({result: 'auth', data: {result: true, data: out}}));
        return true;
}

function logout(urlParts, request, response, body)
{
        response.end(JSON.stringify({ type: "success" }));
        return true;
}

//----------------------------------------------------------------------------------------------------------------------
// PROJECT

function projectList(urlParts, request, response, body)
{
  projects.forEach((p) => {
    let cnt = 0;
    ppds.forEach((ppd) => {
      cnt += (ppd.projectOid == p.oid)? 1 : 0;
    });
    p.totalPpds = cnt;
  });
  response.end(JSON.stringify(toList(projects)));
  console.log('Project list');
  return true;
}

function projectGet(urlParts, request, response, body)
{
    const inObj = JSON.parse(body);
    let oid = inObj.oid;
    let ppdOid = inObj.ppdOid;
    let routeOid = inObj.routeOid;

    let proj = null;
    if (routeOid) {
      const route = routes.find((r) => {
        return r.oid == routeOid;
      });
      if (route)
        ppdOid = route.ppdOid;
    }
    if (ppdOid) {
      const ppd = ppds.find((p) => {
        return p.oid == ppdOid;
      });
      if (ppd)
        oid = ppd.projectOid;
    }
    if (oid) {
      proj = projects.find((p) => {
        return (p.oid == oid);
      });
    };

    response.end(JSON.stringify(proj));
  console.log('Project get: ' + oid);
  return true;
}

function projectSave(urlParts, request, response, body)
{
  const project = JSON.parse(body);
  if (project.oid <= 0) {
    project.oid = getNewOid(projects);
    project.crtdt = moment().utc().format('YYYY-MM-DDThh:mm:ss[Z]');
    projects.push(project);
    console.log('New project: ' + JSON.stringify(project));
    response.end(JSON.stringify({type: 'id', data: {result: true, data: {oid: project.oid, crtdt: project.crtdt, upddt: project.crtdt}}}));
  } else {
    updateByOid(project, projects);
    console.log('Saving project: ' + JSON.stringify(project));
    response.end(JSON.stringify({type: 'id', data: {result: true, data: {oid: project.oid, crtdt: project.crtdt, upddt: project.crtdt}}}));
  }
  writeProjects();
  return true;
}

function projectDelete(urlParts, request, response, body)
{
    const obj = JSON.parse(body);
    console.log('Deleting/arhciving project: ' + JSON.stringify(obj));
    const ret = deleteByOid(obj.oid, projects);
    response.end(JSON.stringify({type: 'id', data: {result: true, data: {oid: ret.oid, crtdt: ret.deldt, upddt: ret.deldt}}}));
    writeProjects();
    return true;
}

//----------------------------------------------------------------------------------------------------------------------
// PPD

function ppdList(urlParts, request, response, body)
{
  const inObj = JSON.parse(body);
  const projectOid = inObj.projectOid;

  let out = [];

  if (projectOid) {
    ppds.forEach((ppd) => {
      if (ppd.projectOid == projectOid) {
        out.push(ppd);
        const route = routes.find((r) => {
          return r.ppdOid == ppd.oid;
        });
        if (route)
           ppd.route = route;
        else
          ppd.route = null;
      }
    }); 
  }

  out.forEach((p) => {
    let cnt = 0;
    files.forEach((f) => {
      cnt += (f.ppdOid == p.oid)? 1 : 0;
    });
    p.totalFiles = cnt;
    cnt = 0;
    comments.forEach((f) => {
      cnt += (f.ppdOid == p.oid)? 1 : 0;
    });
    p.totalComments = cnt;
  });

  response.end(JSON.stringify(toList(out)));
  return true;
}

function ppdSave(urlParts, request, response, body)
{
  const ppd = JSON.parse(body);
  if (ppd.oid <= 0) {
    ppd.oid = getNewOid(ppds);
    ppd.crtdt = moment().utc().format('YYYY-MM-DDThh:mm:ss[Z]');
    ppds.push(ppd);
    console.log('New PPD: ' + JSON.stringify(ppd));
    response.end(JSON.stringify({type: 'id', data: {result: true, data: {oid: ppd.oid, crtdt: ppd.crtdt, upddt: ppd.crtdt}}}));
  } else {
    updateByOid(ppd, ppds);
    console.log('Saving PPD: ' + JSON.stringify(ppd));
    response.end(JSON.stringify({type: 'id', data: {result: true, data: {oid: ppd.oid, crtdt: ppd.crtdt, upddt: ppd.crtdt}}}));
  }
  writePpds();
  return true;
}

function ppdRouteSave(urlParts, request, response, body)
{
  const obj = JSON.parse(body);
  if (obj && obj.routeOid > 0 && obj.name) {
    console.log('Saving route name: ' + JSON.stringify(obj.name));
    const route = routes.find((r) => {
      return r.oid == obj.routeOid;
    });
    if (route) {
      route.name = obj.name;
      response.end(JSON.stringify(route));
    } else {
      console.log('Saving route error');
      response.end(JSON.stringify({type: 'result', data: {result: false, data: {msg: 'No such route', code: 0}}}));
    };
  } else {
    console.log('Saving route error');
    response.end(JSON.stringify({type: 'result', data: {result: false, data: {msg: 'Parameters error', code: 0}}}));
  }
  writeRoutes();
  return true;
}


function ppdSaveStep(urlParts, request, response, body)
{
  const obj = JSON.parse(body);
  if (obj && obj.routeOid > 0 && obj.step) {
    console.log('Saving step: ' + JSON.stringify(obj.step));
    const route = routes.find((r) => {
      return r.oid == obj.routeOid;
    });
    if (route) {
      if (obj.idx < 0)
        route.steps.push(obj.step);
      else
        route.steps[obj.idx] = obj.step;
      response.end(JSON.stringify(route));
    } else {
      console.log('Saving step error');
      response.end(JSON.stringify({type: 'result', data: {result: false, data: {msg: 'No such route', code: 0}}}));
    };
  } else {
    console.log('Saving step error');
    response.end(JSON.stringify({type: 'result', data: {result: false, data: {msg: 'Parameters error', code: 0}}}));
  }
  writeRoutes();
  return true;
}

function ppdDelStep(urlParts, request, response, body)
{
  const obj = JSON.parse(body);
  if (obj && obj.routeOid > 0 && obj.idx >= 0) {
    console.log('Deleting step: ' + JSON.stringify(obj.idx));
    const route = routes.find((r) => {
      return r.oid == obj.routeOid;
    });
    if (route) {
      route.steps.splice(obj.idx, 1);
      response.end(JSON.stringify(route));
    } else {
      console.log('Deleting step error');
      response.end(JSON.stringify({type: 'result', data: {result: false, data: {msg: 'No such route', code: 0}}}));
    };
  } else {
    console.log('Deleting step error');
    response.end(JSON.stringify({type: 'result', data: {result: false, data: {msg: 'Parameters error', code: 0}}}));
  }
  writeRoutes();
  return true;
}

function ppdAddPart(urlParts, request, response, body)
{
  const obj = JSON.parse(body);
  if (obj && obj.routeOid > 0 && obj.idx >= 0 && obj.participant) {
    console.log('Adding part: ' + JSON.stringify(obj.participant));
    const route = routes.find((r) => {
      return r.oid == obj.routeOid;
    });
    if (route) {
      route.steps[obj.idx].parts.push(obj.participant);
      response.end(JSON.stringify(route.steps[obj.idx]));
    } else {
      console.log('Adding part error');
      response.end(JSON.stringify({type: 'result', data: {result: false, data: {msg: 'No such route', code: 0}}}));
    };
  } else {
    console.log('Adding part error');
    response.end(JSON.stringify({type: 'result', data: {result: false, data: {msg: 'Parameters error', code: 0}}}));
  }
  writeRoutes();
  return true;
}

function ppdUpdatePartPrivs(urlParts, request, response, body) {
  const obj = JSON.parse(body);
  if (obj && obj.routeOid > 0 && obj.idx >= 0 && obj.partSid && obj.privs) {
    console.log('Update part privs: ' + JSON.stringify(obj.privs));
    const route = routes.find((r) => {
      return r.oid == obj.routeOid;
    });
    if (route) {
      const parts = route.steps[obj.idx].parts;
      const part = parts.find((p) => {
        return p.sid == obj.partSid;
      });
      if (part) {
        part.privs = obj.privs;
        response.end(JSON.stringify({type: 'result', data: {result: true, data: {msg: 'part deleted', code: 0}}}));
        writeRoutes();
        return true;
      }
    } else {
      console.log('Update part privs');
      response.end(JSON.stringify({type: 'result', data: {result: false, data: {msg: 'No such route', code: 0}}}));
    };
  }
  console.log('Update part privs');
  response.end(JSON.stringify({type: 'result', data: {result: false, data: {msg: 'Parameters error', code: 0}}}));
  return true;
}

function ppdDelPart(urlParts, request, response, body)
{
  const obj = JSON.parse(body);
  if (obj && obj.routeOid > 0 && obj.partSid && obj.idx >= 0) {
    console.log('Deleting part: ' + JSON.stringify(obj.partSid));
    const route = routes.find((r) => {
      return r.oid == obj.routeOid;
    });
    console.log(route);
    if (route) {
     const partIdx = route.steps[obj.idx].parts.findIndex((p) => {
       return p.sid == obj.partSid;
     });
     if (partIdx >= 0) {
       route.steps[obj.idx].parts.splice(partIdx, 1);
       response.end(JSON.stringify({type: 'result', data: {result: true, data: {msg: 'part deleted', code: 0}}}));
       writeRoutes();
       return true;
     };
    } else {
      console.log('Deleting part error (no route)');
      response.end(JSON.stringify({type: 'result', data: {result: false, data: {msg: 'No such route', code: 0}}}));
    };
  };
  console.log('Deleting part error (parameters)');
  response.end(JSON.stringify({type: 'result', data: {result: false, data: {msg: 'Parameters error', code: 0}}}));

  return true;
}

function ppdDelete(urlParts, request, response, body)
{
    const obj = JSON.parse(body);
    console.log('Deleting ppd: ' + JSON.stringify(obj));
    const ret = deleteByOid(obj.oid, ppds);
    response.end(JSON.stringify({type: 'id', data: {result: true, data: {oid: ret.oid, crtdt: ret.deldt, upddt: ret.deldt}}}));
    writePpds();
    return true;
}

function ppdFilesList(urlParts, request, response, body)
{
  const inObj = JSON.parse(body);
  const ppdOid = inObj.ppdOid;

  let out = [];

  if (ppdOid) {
    files.forEach((file) => {
      if (file.ppdOid == ppdOid) {
        out.push(file);
      }
    }); 
  }
  response.end(JSON.stringify(toList(out)));
  return true;
}

function ppdFileSave(urlParts, request, response, body)
{
  const file = JSON.parse(body);
  if (file.oid <= 0) {
    file.oid = getNewOid(files);
    file.crtdt = moment().utc().format('YYYY-MM-DDThh:mm:ss[Z]');
    files.push(file);
    console.log('New file: ' + JSON.stringify(file));
    response.end(JSON.stringify({type: 'id', data: {result: true, data: {oid: file.oid, crtdt: file.crtdt, upddt: file.crtdt}}}));
  } else {
    updateByOid(file, files);
    console.log('Saving file: ' + JSON.stringify(file));
    response.end(JSON.stringify({type: 'id', data: {result: true, data: {oid: file.oid, crtdt: file.crtdt, upddt: file.crtdt}}}));
  }
  writeFiles();
  return true;
}

function ppdFileUpload(urlParts, request, response, body, userData)
{
  if (!userData.file) {
    const pos = urlParts.path.lastIndexOf('/');
    const fileName = urlParts.path.substring(pos + 1);
    if (fileName.length > 0) {
      const f = files.find((f) => {
        return f.oid == fileName;
      });
      userData.oid = f.oid;
      let ext = '';
      const posDot = f.name.lastIndexOf('.'); 
      if (f && posDot >= 0)
        ext = f.name.substring(posDot);
      userData.fileName = fileName + ext;
      userData.file = fs.openSync("db/files/" +  fileName + ext, 'a+');
    };
    userData.size = 0;
  };
  if (body) {
    if (userData && userData.file)
      fs.writeSync(userData.file, body);
    userData.size += body.length;
    //console.log('File chunk: ' + body.length);
  } else {
    if (userData && userData.file)
      fs.closeSync(userData.file);
    console.log('File uploaded: ' + userData.fileName);
    const f = files.find((f) => {
      return f.oid == userData.oid;
    });
    f.size = userData.size;
    f.hash = 'AAAAAAAAAAAAAAAA0000000000000000EEEEEEEEEEEEEEEE7777777777777777';
    f.contentType = request.headers['content-type']
    response.end(JSON.stringify({type: "file", data: {result: true, data: {oid: f.oid, size: f.size, hash: f.hash, crtdt: f.crtdt}}}));
    writeFiles();
  };
  return true;
}

function readChunked(fileName, readFn, completeFn, errorFn) {
   let data = '';
   const readStream = fs.createReadStream(fileName);
   readStream.on('error', (error) => errorFn(error.message));
   readStream.on('data', (chunk) => readFn(chunk));
   readStream.on('end', () => completeFn());
};

function ppdFileDownload(urlParts, request, response, body, userData) 
{
  const pos = urlParts.path.lastIndexOf('/');
  const fileName = urlParts.path.substring(pos + 1);
  if (fileName.length > 0) {
    const f = files.find((f) => {
      return f.oid == fileName;
    });
    if (f) {
      let ext = '';
      const posDot = f.name.lastIndexOf('.'); 
      if (posDot >= 0)
        ext = f.name.substring(posDot);
      response.setHeader("Content-Type", f.contentType);
      response.setHeader("Content-Length", f.size);
      response.setHeader("Content-Disposition", "inline; filename=\"" + fileName + ext + "\"");
      console.log('File downloading: ' + fileName + ext);
      let size = 0;
      readChunked("db/files/" +  fileName + ext, (chunk) => {
        size += chunk.length;
        response.write(chunk);
      }, () => {
        console.log('File download finished: ' + fileName + ext);
      }, (error) => {
        response.end(JSON.stringify({type: "result", data: {result: false, data: {msg: error}}}));
        response.end();
      });
      return true;
    };
  };
  response.end(JSON.stringify({type: "result", data: {result: false, data: {msg: "Файл не найден"}}}));
  return true;
}

function ppdFileSign(urlParts, request, response, body, userData) 
{
  const obj = JSON.parse(body);
  const file = files.find((f) => {
    return f.oid == obj.oid;
  });
  file.sign = obj.sign;
  file.signdt = moment().utc().format('YYYY-MM-DDThh:mm:ss[Z]');
  response.end(JSON.stringify({type: "sign", data: {result: true, data:{certSN: '40e588736e8f973100001bbf', subject: 'БДГ', crtdt: file.signdt}}}));
  writeFiles();
  return true;
}

function ppdFileSignVerify(urlParts, request, response, body, userData) 
{
  const obj = JSON.parse(body);
  const file = files.find((f) => {
    return f.oid == obj.oid;
  });
  response.end(JSON.stringify({type: "sign", data: {result: true, data:{certSN: '40e588736e8f973100001bbf', subject: 'БДГ', crtdt: file.signdt}}}));
  return true;
}

function ppdFileDelete(urlParts, request, response, body, userData) 
{
  const obj = JSON.parse(body);
  const foid = obj.oid;
    let idx = -1;
    const f = files.find((f) => {
       idx ++;
       return f.oid == foid;
    });
    if (f) {
      let ext = '';
      const posDot = f.name.lastIndexOf('.'); 
      if (posDot >= 0)
        ext = f.name.substring(posDot);

      console.log('Delete file: ' + foid + ext);
      fs.unlink('db/files/' + foid + ext, () => {});
      files.splice(idx, 1);
      writeFiles();
      response.end(JSON.stringify({type: "result", data: {result: true, data: {msg: "Файл удалён"}}}));
      return true;
    };
  console.log('File not found: ' + foid);
  response.end(JSON.stringify({type: "result", data: {result: false, data: {msg: "Файл не найден"}}}));
  return true;
}

//----------------------------------------------------------------------------------------------------------------------
// COMMENTS

function ppdCommentsList(urlParts, request, response, body)
{
  const inObj = JSON.parse(body);
  const ppdOid = inObj.ppdOid;

  let out = [];

  if (ppdOid) {
    comments.forEach((c) => {
      if (c.ppdOid == ppdOid) {
        out.push(c);
      }
    }); 
  }
  response.end(JSON.stringify(toList(out)));
  return true;
}

function ppdCommentAdd(urlParts, request, response, body)
{
  const inObj = JSON.parse(body);
  const ppdOid = inObj.ppdOid;

  if (ppdOid) {
    const route = routes.find((r) => {
    return r.ppdOid == ppdOid});
    if (route) {
      const out = {oid: getNewOid(comments), runningStep: route.runningStep, ppdOid: ppdOid, part: 'nodm-2', request: inObj.request, reqdt: moment().utc().format('YYYY-MM-DDThh:mm:ss[Z]'), answer: '', ansdt: ''};
      comments.push(out);
      response.end(JSON.stringify(out));
      writeComments();
      return true;
    }
  }
  response.end(JSON.stringify({type: "result", data: {result: false, data: {msg: "error"}}}));
  return true;
}

function ppdCommentResponse(urlParts, request, response, body)
{
  const inObj = JSON.parse(body);
  const ppdOid = inObj.ppdOid;

  if (ppdOid) {
    const comment = comments.find((c) => {
      return c.ppdOid == ppdOid && c.oid == inObj.oid;
    });
    if (comment) {
      comment.answer = inObj.answer;
      comments.ansdt = moment().utc().format('YYYY-MM-DDThh:mm:ss[Z]');
      response.end(JSON.stringify(comments));
      writeComments();
      return true;
    }
  }
  response.end(JSON.stringify({type: "result", data: {result: false, data: {msg: "error"}}}));
  return true;
}

//----------------------------------------------------------------------------------------------------------------------

readDB();

const handlersHttp = 
[
     { auth: false, method: 'POST', path: '/local/api/v1/cert/login', stream: true, handler: login.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/auth/info', stream: true, handler: login.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/auth/logout', stream: true, handler: logout.bind(this)},

     { auth: false, method: 'POST', path: '/local/api/v1/project/list', stream: true, handler: projectList.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/project/get', stream: true, handler: projectGet.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/project/save', stream: true, handler: projectSave.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/project/delete', stream: true, handler: projectDelete.bind(this)},

     { auth: false, method: 'POST', path: '/local/api/v1/ppd/list', stream: true, handler: ppdList.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/save', stream: true, handler: ppdSave.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/delete', stream: true, handler: ppdDelete.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/route/save', stream: true, handler: ppdRouteSave.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/route/saveStep', stream: true, handler: ppdSaveStep.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/route/delStep', stream: true, handler: ppdDelStep.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/route/addPart', stream: true, handler: ppdAddPart.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/route/delPart', stream: true, handler: ppdDelPart.bind(this)},

     { auth: false, method: 'POST', path: '/local/api/v1/ppd/files/list', stream: true, handler: ppdFilesList.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/files/save', stream: true, handler: ppdFileSave.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/files/upload/*', stream: true, handler: ppdFileUpload.bind(this), bin: true},
     { auth: false, method: 'GET', path: '/local/api/v1/ppd/files/download/*', stream: true, handler: ppdFileDownload.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/files/sign', stream: true, handler: ppdFileSign.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/files/signVerify', stream: true, handler: ppdFileSignVerify.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/files/delete', stream: true, handler: ppdFileDelete.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/route/updatePartPrivs', stream: true, handler: ppdUpdatePartPrivs.bind(this)},

     { auth: false, method: 'POST', path: '/local/api/v1/ppd/comments/list', stream: true, handler: ppdCommentsList.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/comments/add', stream: true, handler: ppdCommentAdd.bind(this)},
     { auth: false, method: 'POST', path: '/local/api/v1/ppd/comments/response', stream: true, handler: ppdCommentResponse.bind(this)},
];
 
const handlersWs = 
[
     { auth: true, method: 'GET', path: '/api/v1/ws', stream: true, handler: eventsConnectedWs.bind(this), handlerIn: eventsInWs.bind(this), handlerClose: eventsCloseWs.bind(this) }
];
 
ws.startHttp('0.0.0.0', 4201, handlersHttp, handlersWs, checkAuth.bind(this));
