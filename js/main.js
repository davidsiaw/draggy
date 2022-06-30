DEBUG = 1;

function errobj()
{
    try { throw Error('') } catch(err) { return err; }
}

function log()
{
  if (DEBUG != 1) { return }
  var err = errobj();
  var caller_line = err.stack.split("\n")[3];
  var index = caller_line.indexOf("at ");
  var clean = caller_line.slice(index+2, caller_line.length);

  console.log(caller_line, ... arguments);
}

function Point(x, y)
{
  var self = this;

  this.set_x = function(val)
  {
    x = val;
  }

  this.x = function()
  {
    return x;
  }

  this.set_y = function(val)
  {
    y = val;
  }

  this.y = function()
  {
    return y;
  }

  return self;
}

function MouseHandler()
{
  var self = this;

  var data = null;
  var mousemove = function() {};
  var mouseup = function() {};
  var mousedown = function() {};
  var wheel = function() {};

  this.set_data = function(val)
  {
    data = val;
  }

  this.set_mousemove = function(val)
  {
    mousemove = val;
  }

  this.set_mouseup = function(val)
  {
    mouseup = val;
  }

  this.set_mousedown = function(val)
  {
    mousedown = val;
  }

  this.set_wheel = function(val)
  {
    wheel = val;
  }

  this.onmousemove = function(e)
  {
    mousemove(e, data);
  }

  this.onmouseup = function(e)
  {
    mouseup(e, data);
  }

  this.onmousedown = function(e)
  {
    mousedown(e, data);
  }

  this.onwheel = function(e)
  {
    wheel(e, data);
  }

  return self;
}

function UIElement()
{
  var self = this;

  var position = new Point(0, 0);
  var size = new Point(0, 0);

  this.set_position = function(x, y)
  {
    position = new Point(x,y);
  }

  this.position = function()
  {
    return position;
  }

  this.set_size = function(w, h)
  {
    size = new Point(w, h);
  }

  this.size = function()
  {
    return size;
  }

  this.mousehandler = function()
  {
    return new MouseHandler();
  }

  this.draw = function(ctx)
  {

  }

  return self;
}

function UIPanel()
{
  var self = new UIElement();

  self.mousehandler = function()
  {
    return new MouseHandler();
  }

  self.draw = function(ctx)
  {
    ctx.fillStyle = '#444';
    ctx.fillRect(
      self.position().x(),
      self.position().y(),
      self.size().x(),
      self.size().y());
  }

  return self;
}

function UITileFactory(canvas, tw, th, klass)
{
  var self = new UIElement();

  var ghostpos = new Point(0, 0);
  var dragstart_x = 0;
  var dragstart_y = 0;

  var dragging = false;
  var ok = false;

  var handler = new MouseHandler();

  handler.set_mousedown(function(e, data)
  {
    dragging = true;
    ghostpos.set_x(self.position().x());
    ghostpos.set_y(self.position().y());
    dragstart_x = e.offsetX;
    dragstart_y = e.offsetY;

  })

  handler.set_mouseup(function(e, data)
  {
    dragging = false;
    canvas.highlight_tiles = [];

    if(ok)
    {

      var p = canvas.tilecoord_at(e.offsetX, e.offsetY)

      for (xx = 0; xx < tw; xx++)
      for (yy = 0; yy < th; yy++)
      {
        var tx = p.x() + xx;
        var ty = p.y() + yy;

        var key = tx + ',' + ty;
        canvas.tilemap[key] = new klass(xx, yy, canvas);
      }
    }

  })

  var OKCOLOR = 'rgba(0, 250, 0, 0.5)';
  var NOTOKCOLOR = 'rgba(250, 0, 0, 0.5)';

  handler.set_mousemove(function(e, data)
  {
    ghostpos.set_x(ghostpos.x() + e.offsetX - dragstart_x);
    ghostpos.set_y(ghostpos.y() + e.offsetY - dragstart_y);
    dragstart_x = e.offsetX;
    dragstart_y = e.offsetY;

    if (canvas)
    {
      // log(canvas.tilecoord_at(e.offsetX, e.offsetY))

      var p = canvas.tilecoord_at(e.offsetX, e.offsetY)
      ok = true

      var arr = [];
      for (xx = 0; xx < tw; xx++)
      for (yy = 0; yy < th; yy++)
      {
        var tx = p.x() + xx;
        var ty = p.y() + yy;
        arr.push(new Point(tx, ty));

        var key = tx + ',' + ty;
        if (canvas.tilemap[key])
        {
          ok = false
        }
      }

      canvas.highlight_tiles = arr;
      canvas.highlight_color = ok ? OKCOLOR : NOTOKCOLOR;
    }
  })

  self.mousehandler = function()
  {
    return handler;
  }

  self.draw = function(ctx)
  {
    ctx.fillStyle = 'blue';
    ctx.fillRect(
      self.position().x(),
      self.position().y(),
      self.size().x(),
      self.size().y());

    // debug text
    ctx.fillStyle = 'white';
    ctx.fillText(tw + 'x' + th, 
      self.position().x() + 2,
      self.position().y() + 15);


    if (dragging)
    {
      // draw the ghost
      ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
      ctx.fillRect(
        ghostpos.x(),
        ghostpos.y(),
        self.size().x(),
        self.size().y());
    }
  }
  return self;
}

function Canvas(elem)
{
  var self = this;

  var running = false;
  var canvas = document.createElement("canvas");
  elem.appendChild(canvas);

  var ctx = canvas.getContext('2d');
  var width = elem.clientWidth;
  var height = elem.clientHeight;
  canvas.width = width;
  canvas.height = height;

  var topleft = new Point(0, 0);

  var tilesize = 20;

  this.tilemap = {};
  this.ui = [];
  this.highlight_tiles = [];
  this.highlight_color = '#0d0';

  function refresh()
  {
    if (!running) { return }

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    var xacr = width / tilesize + 1;
    var yacr = height / tilesize + 1;

    var shiftx = topleft.x() % tilesize;
    var shifty = topleft.y() % tilesize;

    var toplefttx = Math.floor( (topleft.x() - shiftx) / tilesize );
    var topleftty = Math.floor( (topleft.y() - shifty) / tilesize );

    // log(topleft.x(), topleft.x() / tilesize, toplefttx)

    // foreach tile displayed
    for (var x=-1; x<xacr; x++)
    for (var y=-1; y<yacr; y++)
    {
      ctx.strokeStyle = '#333';

      var tilex = x*tilesize-shiftx;
      var tiley = y*tilesize-shifty;
      ctx.strokeRect(tilex + 3, tiley + 3, tilesize - 6, tilesize - 6);

      var tx = x + toplefttx;
      var ty = y + topleftty;

      for (var hi=0; hi<self.highlight_tiles.length; hi++)
      {
        var hitile = self.highlight_tiles[hi];

        if (hitile.x() == tx && hitile.y() == ty)
        {
          ctx.fillStyle = self.highlight_color
          ctx.fillRect(tilex, tiley, tilesize, tilesize);
        }
      }

      //ctx.strokeText(tx + ',' + ty, tilex + 4, tiley + 20);

      var key = tx + ',' + ty;
      var tileobj = self.tilemap[key];
      if (tileobj)
      {
        tileobj.draw(ctx, tilex, tiley, tilesize);
      }
    }

    for(var i=0;i<self.ui.length;i++)
    {
      var elem = self.ui[i];
      elem.draw(ctx);
    }

    // ctx.fillStyle = '#444';
    // ctx.fillRect(width - 200, 0, width, height);

    window.requestAnimationFrame(refresh);
  }

  var default_mousehandler = new MouseHandler();
  var tilemap_mousehandler = new MouseHandler();

  default_mousehandler.set_wheel(function(e, data)
  {
    var newsize = tilesize + e.deltaY
    if (newsize < 4)
    {
      newsize = 4;
    }
    if (newsize > 128)
    {
      newsize = 128;
    }

    // find the tilespace coord at mouse cursor
    var tc = self.subtilecoord_at(e.offsetX, e.offsetY);

    // set the tilesize to new tilesize
    tilesize = newsize;

    // find the new tilespace coord
    var ntc = self.subtilecoord_at(e.offsetX, e.offsetY);

    // move the topleft accordingly so the map stays
    // centered on the mouse
    topleft.set_x(topleft.x() + ((tc.x() - ntc.x()) * newsize) );
    topleft.set_y(topleft.y() + ((tc.y() - ntc.y()) * newsize) );
  })

  tilemap_mousehandler.set_mousedown(function(e, data)
  {
    dragstart_x = e.offsetX;
    dragstart_y = e.offsetY;
  })

  tilemap_mousehandler.set_mouseup(function(e, data)
  {
  })

  tilemap_mousehandler.set_mousemove(function(e, data)
  {
    topleft.set_x(topleft.x() - e.offsetX + dragstart_x);
    topleft.set_y(topleft.y() - e.offsetY + dragstart_y);
    dragstart_x = e.offsetX;
    dragstart_y = e.offsetY;
  })

  var dragstart_x = 0;
  var dragstart_y = 0;

  var mousehandler = default_mousehandler;

  function mouseup(e)
  {
    mousehandler.onmouseup(e);
    mousehandler = default_mousehandler;
  }

  function mousedown(e)
  {
    // find an ui element at that position
    var uielem = null;
    for(var i=self.ui.length-1;i>=0;i--)
    {
      var elem = self.ui[i];
      if (e.offsetX > elem.position().x()
        && e.offsetX < elem.position().x() + elem.size().x()
        && e.offsetY > elem.position().y()
        && e.offsetY < elem.position().y() + elem.size().y())
      {
        uielem = elem;
        mousehandler = elem.mousehandler();
        break;
      }
    }

    if (!uielem)
    {
      // find a tile that handles mouse
      var tc = self.tilecoord_at(e.offsetX, e.offsetY);
      var key = tc.x() + ',' + tc.y();

      if (self.tilemap[key] && self.tilemap[key].mousehandler())
      {
        mousehandler = self.tilemap[key].mousehandler();
      }
      else
      {
        // Otherwise, propagate the mouse handling to the map
        mousehandler = tilemap_mousehandler;
      }
    }
    mousehandler.onmousedown(e);
  }

  function mousemove(e)
  {
    mousehandler.onmousemove(e);
  }

  function wheel(e)
  {
    mousehandler.onwheel(e);
  }

  this.start = function()
  {
    running = true;
    refresh();
  }
  
  this.stop = function()
  {
    running = false;
  }

  this.tilecoord_at = function(mx, my)
  {
    var shiftx = topleft.x() % tilesize;
    var shifty = topleft.y() % tilesize;

    var toplefttx = Math.floor( (topleft.x() - shiftx) / tilesize );
    var topleftty = Math.floor( (topleft.y() - shifty) / tilesize );

    return new Point(
      toplefttx + Math.floor((mx + shiftx) / tilesize),
      topleftty + Math.floor((my + shifty) / tilesize)
    );
  }

  this.subtilecoord_at = function(mx, my)
  {
    var shiftx = topleft.x() % tilesize;
    var shifty = topleft.y() % tilesize;

    var toplefttx = (topleft.x() - shiftx) / tilesize;
    var topleftty = (topleft.y() - shifty) / tilesize;

    return new Point(
      toplefttx + ((mx + shiftx) / tilesize),
      topleftty + ((my + shifty) / tilesize)
    );
  }

  log(elem);

  canvas.addEventListener('mouseup', mouseup);
  canvas.addEventListener('mousedown', mousedown);
  canvas.addEventListener('mousemove', mousemove);
  canvas.addEventListener('wheel', wheel);

  return self;
}

function TIElement(tx, ty, data)
{
  self = this;

  this.mousehandler = function()
  {

  }

  this.draw = function(ctx, px, py, tilesize)
  {

  }

  this.tx = function() { return tx; }
  this.ty = function() { return ty; }

  return self;
}

function TIPanel(tx, ty, data)
{
  self = new TIElement(tx, ty, data);

  var mousehandler = new MouseHandler();
  mousehandler.set_data(data);

  mousehandler.set_mousedown(function(e, data)
  {
  });

  mousehandler.set_mouseup(function(e, data)
  {
  });

  mousehandler.set_mousemove(function(e, data)
  {
  });

  self.mousehandler = function()
  {
    return mousehandler;
  }

  self.draw = function(ctx, px, py, tilesize)
  {
    ctx.fillStyle = '#aaa'
    ctx.fillRect(px, py, tilesize, tilesize);

    ctx.strokeStyle = '#000'

    ctx.beginPath();
    ctx.arc(px+tilesize/2, py+tilesize/2, tilesize/3, 0, 2 * Math.PI);
    ctx.stroke();
  }

  return self;
}


function TIConnector(tx, ty, data)
{
  self = new TIElement(tx, ty, data);

  var mousehandler = new MouseHandler();
  mousehandler.set_data(data);

  var dragging = false;
  var dragpos = new Point(0, 0);
  var s = new Point(0, 0);

  mousehandler.set_mousedown(function(e, data)
  {
    dragging = true;
    dragpos = new Point(e.offsetX, e.offsetY);
    s = data.tilecoord_at(dragpos.x(), dragpos.y());
  });

  mousehandler.set_mouseup(function(e, data)
  {
    dragging = false;
    data.highlight_tiles = []

  });

  mousehandler.set_mousemove(function(e, data)
  {
    dragpos = new Point(e.offsetX, e.offsetY);

    var tile = data.tilecoord_at(dragpos.x(), dragpos.y());

    var diffx = tile.x() - s.x();
    var diffy = tile.y() - s.y();

    data.highlight_tiles = [tile]

        log('x',tile.x(), s.x())
        log('y',tile.y(), s.y())

    while(diffx != 0 || diffy != 0)
    {

      var ax = Math.abs(diffx);
      var ay = Math.abs(diffy);

      if (diffx)
      {
        diffx -= Math.sign(diffx);
      }
      else
      {
        diffy -= Math.sign(diffy);
      }

      data.highlight_tiles.push(new Point(diffx + s.x(), diffy + s.y()));
    }

    data.highlight_color = 'blue'
  });

  self.mousehandler = function()
  {
    return mousehandler;
  }

  self.draw = function(ctx, px, py, tilesize)
  {
    var sqsz = tilesize / 2;
    ctx.fillStyle = '#aaa'
    ctx.fillRect(px + sqsz/2, py+ sqsz/2, sqsz, sqsz);

    if (dragging)
    {
      ctx.strokeStyle = '#0f0'
      ctx.beginPath();
      ctx.moveTo(px + sqsz, py + sqsz);
      ctx.lineTo(dragpos.x(), dragpos.y());
      ctx.stroke();


    }


  }

  return self;
}



window.onload = function()
{
  var c = new Canvas(document.getElementById('body'));

  var panel = new UIPanel();
  panel.set_size(200, 400);
  c.ui.push(panel);

  var drg = new UITileFactory(c, 4, 3, TIPanel);
  drg.set_position(20, 20)
  drg.set_size(40, 40);
  c.ui.push(drg);

  var drg = new UITileFactory(c, 2, 2, TIPanel);
  drg.set_position(20, 80)
  drg.set_size(40, 40);
  c.ui.push(drg);

  var drg = new UITileFactory(c, 1, 1, TIConnector);
  drg.set_position(20, 140)
  drg.set_size(40, 40);
  c.ui.push(drg);

  var ti = new TIPanel();
  c.tilemap['10,5'] = ti;

  c.start();
};

